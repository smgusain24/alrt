import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alrt.config import settings
from alrt.deps import get_db, get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.subscriber import (
    CreateSubscriber,
    SubscriberResponse,
    UpdatePreferences,
    UpdateSubscriber,
)
from alrt_db.models.subscriber import Subscriber

router = APIRouter(prefix="/subscribers", tags=["subscribers"])


async def _get_subscriber(db, team_id, external_id):
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.team_id == team_id,
            Subscriber.external_id == external_id,
            Subscriber.is_deleted == False,
        )
    )
    return result.scalar_one_or_none()


@router.post("", response_model=SubscriberResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_subscriber(
    request: Request,
    body: CreateSubscriber,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    existing = await _get_subscriber(db, team_id, body.external_id)
    if existing:
        raise HTTPException(status_code=409, detail="Subscriber already exists")

    subscriber = Subscriber(
        team_id=team_id,
        external_id=body.external_id,
        email=body.email,
        name=body.name,
        slack_user_id=body.slack_user_id,
        custom_properties=body.custom_properties,
        channel_preferences=body.channel_preferences,
    )
    db.add(subscriber)
    await db.commit()
    await db.refresh(subscriber)
    return SubscriberResponse.model_validate(subscriber)


@router.get("/{external_id}", response_model=SubscriberResponse)
@limiter.limit(settings.rate_limit_read)
async def get_subscriber(
    request: Request,
    external_id: str,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _get_subscriber(db, team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return SubscriberResponse.model_validate(subscriber)


@router.patch("/{external_id}", response_model=SubscriberResponse)
@limiter.limit(settings.rate_limit_write)
async def update_subscriber(
    request: Request,
    external_id: str,
    body: UpdateSubscriber,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _get_subscriber(db, team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(subscriber, field, value)

    await db.commit()
    await db.refresh(subscriber)
    return SubscriberResponse.model_validate(subscriber)


@router.delete("/{external_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_subscriber(
    request: Request,
    external_id: str,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _get_subscriber(db, team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    subscriber.is_deleted = True
    await db.commit()


@router.get("/{external_id}/preferences")
@limiter.limit(settings.rate_limit_read)
async def get_preferences(
    request: Request,
    external_id: str,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _get_subscriber(db, team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return {"channel_preferences": subscriber.channel_preferences}


@router.patch("/{external_id}/preferences")
@limiter.limit(settings.rate_limit_write)
async def update_preferences(
    request: Request,
    external_id: str,
    body: UpdatePreferences,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await _get_subscriber(db, team_id, external_id)
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    subscriber.channel_preferences = body.channel_preferences
    await db.commit()
    await db.refresh(subscriber)
    return {"channel_preferences": subscriber.channel_preferences}
