import uuid
from datetime import datetime, timezone

from fastapi import Depends, HTTPException

from alrt.billing.provider import BillingProvider
from alrt.config import settings
from alrt.db import execute_read_one_query
from alrt.deps import get_current_team
from alrt.queries import billing as billing_q


_provider_instance: BillingProvider | None = None


def get_billing_provider() -> BillingProvider:
    global _provider_instance
    if _provider_instance is None:
        if settings.billing_provider == "razorpay":
            from alrt.billing.razorpay import RazorpayProvider
            _provider_instance = RazorpayProvider(
                key_id=settings.razorpay_key_id,
                key_secret=settings.razorpay_key_secret,
                webhook_secret=settings.razorpay_webhook_secret,
            )
        else:
            raise ValueError(f"Unknown billing provider: {settings.billing_provider}")
    return _provider_instance


async def enforce_quota(
    team_id: uuid.UUID = Depends(get_current_team),
) -> uuid.UUID:
    """Pre-check quota before trigger dispatch. Returns team_id if allowed."""
    row = await execute_read_one_query(billing_q.GET_QUOTA_FOR_ENFORCEMENT, [team_id])

    if not row:
        raise HTTPException(status_code=500, detail="Team billing state not found")

    status = row["billing_status"]
    now = datetime.now(timezone.utc)

    # Check billing status
    if status == "expired":
        raise HTTPException(status_code=402, detail="Trial expired, please upgrade")

    if status == "cancelled":
        period_ends_at = row.get("period_ends_at")
        if period_ends_at and period_ends_at < now:
            raise HTTPException(status_code=402, detail="Subscription ended")

    # Check quota (only hard-block for free tier)
    plan_name = row.get("plan_name", "free")
    quota_limit = row.get("quota_limit")
    quota_used = row.get("quota_used", 0)

    if quota_limit and quota_used >= quota_limit and plan_name == "free":
        raise HTTPException(status_code=429, detail="Monthly quota exceeded. Upgrade your plan.")

    return team_id
