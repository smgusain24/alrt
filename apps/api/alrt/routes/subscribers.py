import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_read_query, execute_read_one_query, execute_insert_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import subscribers as sub_q
from alrt.schemas.subscriber import (
    CreateSubscriber,
    PreferencesResponse,
    SubscriberResponse,
    UpdatePreferences,
    UpdateSubscriber,
)

router = APIRouter(prefix="/subscribers", tags=["subscribers"])


async def _find_subscriber(team_id: uuid.UUID, external_id: str) -> dict | None:
    return await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, external_id])


@router.post("", response_model=SubscriberResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_subscriber(
    request: Request,
    body: CreateSubscriber,
    team_id: uuid.UUID = Depends(get_current_team),
):
    existing = await _find_subscriber(team_id, body.external_id)
    if existing:
        raise HTTPException(status_code=409, detail="Subscriber already exists")

    row = await execute_insert_query(
        sub_q.CREATE,
        [
            uuid.uuid4(),
            team_id,
            body.external_id,
            body.email,
            body.name,
            body.slack_user_id,
            body.phone_number,
            body.discord_webhook_url,
            body.telegram_chat_id,
            body.custom_properties or {},
            body.channel_preferences or {},
        ],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create subscriber")
    return SubscriberResponse.model_validate(row)


@router.get("")
@limiter.limit(settings.rate_limit_read)
async def list_subscribers(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    team_id: uuid.UUID = Depends(get_current_team),
):
    if limit > 100:
        limit = 100
    rows = await execute_read_query(sub_q.LIST_BY_TEAM, [team_id, limit, offset])
    count_row = await execute_read_one_query(sub_q.COUNT_BY_TEAM, [team_id])
    total = count_row["total"] if count_row else 0
    return {
        "data": [SubscriberResponse.model_validate(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{external_id}", response_model=SubscriberResponse)
@limiter.limit(settings.rate_limit_read)
async def get_subscriber(
    request: Request,
    external_id: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _find_subscriber(team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return SubscriberResponse.model_validate(subscriber)


@router.patch("/{external_id}", response_model=SubscriberResponse)
@limiter.limit(settings.rate_limit_write)
async def update_subscriber(
    request: Request,
    external_id: str,
    body: UpdateSubscriber,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _find_subscriber(team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    updates = body.model_dump(exclude_unset=True)

    # Use COALESCE pattern: pass None for unchanged fields so DB keeps existing value
    custom_props = updates["custom_properties"] if "custom_properties" in updates else None
    chan_prefs = updates["channel_preferences"] if "channel_preferences" in updates else None

    row = await execute_insert_query(
        sub_q.UPDATE,
        [
            subscriber["id"],
            updates.get("email"),
            updates.get("name"),
            updates.get("slack_user_id"),
            updates.get("phone_number"),
            updates.get("discord_webhook_url"),
            updates.get("telegram_chat_id"),
            custom_props,
            chan_prefs,
        ],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to update subscriber")
    return SubscriberResponse.model_validate(row)


@router.delete("/{external_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_subscriber(
    request: Request,
    external_id: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _find_subscriber(team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    await execute_update_query(sub_q.SOFT_DELETE, [subscriber["id"]])


@router.get("/{external_id}/preferences")
@limiter.limit(settings.rate_limit_read)
async def get_preferences(
    request: Request,
    external_id: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _find_subscriber(team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    prefs = subscriber["channel_preferences"] or {}
    return PreferencesResponse(
        **{"global": prefs.get("global", {}),
           "categories": prefs.get("categories", {}),
           "dnd": prefs.get("dnd"),
           "frequency": prefs.get("frequency")}
    )


@router.patch("/{external_id}/preferences")
@limiter.limit(settings.rate_limit_write)
async def update_preferences(
    request: Request,
    external_id: str,
    body: UpdatePreferences,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _find_subscriber(team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Serialize with alias so "global_" becomes "global" in the JSONB
    prefs_dict = body.channel_preferences.model_dump(by_alias=True)
    row = await execute_insert_query(
        sub_q.UPDATE_PREFERENCES,
        [subscriber["id"], prefs_dict],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to update preferences")
    updated_prefs = row["channel_preferences"] or {}
    return PreferencesResponse(
        **{"global": updated_prefs.get("global", {}),
           "categories": updated_prefs.get("categories", {}),
           "dnd": updated_prefs.get("dnd"),
           "frequency": updated_prefs.get("frequency")}
    )
