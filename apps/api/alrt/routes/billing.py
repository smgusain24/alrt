import hashlib
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.billing.deps import get_billing_provider
from alrt.billing.provider import BillingProvider
from alrt.config import settings
from alrt.db import execute_read_query, execute_read_one_query, execute_insert_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import billing as billing_q
from alrt.schemas.billing import (
    BillingCurrentResponse,
    CancelResponse,
    PlanResponse,
    SubscribeRequest,
    SubscribeResponse,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[PlanResponse])
@limiter.limit(settings.rate_limit_read)
async def list_plans(request: Request):
    rows = await execute_read_query(billing_q.LIST_ACTIVE_PLANS)
    return rows


@router.get("/current", response_model=BillingCurrentResponse)
@limiter.limit(settings.rate_limit_read)
async def get_current_billing(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    row = await execute_read_one_query(billing_q.GET_TEAM_BILLING, [team_id])
    if not row:
        raise HTTPException(status_code=404, detail="Billing state not found")
    return row


@router.post("/subscribe", response_model=SubscribeResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def subscribe(
    request: Request,
    body: SubscribeRequest,
    team_id: uuid.UUID = Depends(get_current_team),
    provider: BillingProvider = Depends(get_billing_provider),
):
    # Validate plan
    plan = await execute_read_one_query(billing_q.FIND_PLAN_BY_ID, [body.plan_id])
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan["name"] == "free":
        raise HTTPException(status_code=400, detail="Cannot subscribe to the free plan")

    # Check no existing active subscription
    billing = await execute_read_one_query(billing_q.GET_TEAM_BILLING, [team_id])
    if billing and billing["billing_status"] == "active" and billing["subscription_id"]:
        raise HTTPException(status_code=409, detail="Team already has an active subscription")

    # Get user email for Razorpay
    user = await execute_read_one_query(billing_q.FIND_ADMIN_EMAIL_BY_TEAM, [team_id])
    email = user["email"] if user else ""

    result = await provider.create_subscription(str(team_id), plan, email)

    await execute_update_query(billing_q.UPDATE_TEAM_BILLING, [
        team_id, body.plan_id, "pending", settings.billing_provider,
        result["subscription_id"], None,
    ])

    return SubscribeResponse(
        subscription_id=result["subscription_id"],
        checkout_url=result["checkout_url"],
    )


@router.post("/cancel", response_model=CancelResponse)
@limiter.limit(settings.rate_limit_write)
async def cancel_subscription(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
    provider: BillingProvider = Depends(get_billing_provider),
):
    billing = await execute_read_one_query(billing_q.GET_TEAM_BILLING, [team_id])
    if not billing or not billing.get("subscription_id"):
        raise HTTPException(status_code=404, detail="No active subscription found")
    if billing["billing_status"] not in ("active", "past_due"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel subscription with status: {billing['billing_status']}")

    await provider.cancel_subscription(billing["subscription_id"])
    await execute_update_query(billing_q.UPDATE_TEAM_STATUS, [team_id, "cancelled"])

    return CancelResponse(status="cancelled")


@router.post("/webhook", status_code=200)
@limiter.exempt
async def handle_webhook(
    request: Request,
    provider: BillingProvider = Depends(get_billing_provider),
):
    body = await request.body()
    headers = dict(request.headers)

    event = provider.verify_webhook(headers, body)
    if event is None:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["event_type"]
    subscription_id = event.get("subscription_id", "")
    team_id_str = event.get("notes", {}).get("team_id", "")

    if not team_id_str:
        return {"status": "ignored", "reason": "no team_id in notes"}

    team_id = uuid.UUID(team_id_str)

    # Dedup — insert returns None if ON CONFLICT DO NOTHING hits
    payload_hash = hashlib.sha256(body).hexdigest()
    safe_metadata = {
        "event_type": event_type,
        "subscription_id": subscription_id,
        "status": event.get("status", ""),
    }

    inserted = await execute_insert_query(billing_q.INSERT_BILLING_EVENT, [
        team_id, settings.billing_provider, event_type,
        event.get("event_id", ""), payload_hash, json.dumps(safe_metadata),
    ])

    if not inserted:
        return {"status": "duplicate"}

    # Handle event
    current_period_end = event.get("current_period_end")
    period_ends_at = None
    if current_period_end:
        from datetime import datetime, timezone
        period_ends_at = datetime.fromtimestamp(current_period_end, tz=timezone.utc)

    if event_type == "subscription.activated":
        billing = await execute_read_one_query(billing_q.GET_TEAM_BILLING, [team_id])
        plan_id = billing["plan_id"] if billing else None
        await execute_update_query(billing_q.UPDATE_TEAM_BILLING, [
            team_id, plan_id, "active", settings.billing_provider,
            subscription_id, period_ends_at,
        ])

    elif event_type == "subscription.charged":
        if period_ends_at:
            await execute_update_query(billing_q.UPDATE_TEAM_PERIOD_END, [team_id, period_ends_at])

    elif event_type == "subscription.halted":
        await execute_update_query(billing_q.UPDATE_TEAM_STATUS, [team_id, "past_due"])

    elif event_type == "subscription.cancelled":
        await execute_update_query(billing_q.UPDATE_TEAM_STATUS, [team_id, "cancelled"])
        if period_ends_at:
            await execute_update_query(billing_q.UPDATE_TEAM_PERIOD_END, [team_id, period_ends_at])

    return {"status": "processed", "event_type": event_type}
