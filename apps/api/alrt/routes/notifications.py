import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from alrt.config import settings
from alrt.deps import get_db, get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.notification import NotificationResponse, UpdateNotification
from alrt_db.models.notification import Notification
from alrt_db.models.subscriber import Subscriber

router = APIRouter(tags=["notifications"])


async def _resolve_subscriber(db, team_id, external_id):
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.team_id == team_id,
            Subscriber.external_id == external_id,
            Subscriber.is_deleted == False,
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    return sub


@router.get(
    "/subscribers/{external_id}/notifications",
    response_model=list[NotificationResponse],
)
@limiter.limit(settings.rate_limit_read)
async def list_notifications(
    request: Request,
    external_id: str,
    channel: str | None = Query(None),
    is_read: bool | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    sub = await _resolve_subscriber(db, team_id, external_id)

    query = select(Notification).where(
        Notification.subscriber_id == sub.id,
        Notification.team_id == team_id,
        Notification.is_archived == False,
    )
    if channel:
        query = query.where(Notification.channel == channel)
    if is_read is not None:
        query = query.where(Notification.is_read == is_read)

    query = query.order_by(Notification.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


@router.patch(
    "/subscribers/{external_id}/notifications/{notification_id}",
    response_model=NotificationResponse,
)
@limiter.limit(settings.rate_limit_write)
async def update_notification(
    request: Request,
    external_id: str,
    notification_id: uuid.UUID,
    body: UpdateNotification,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    sub = await _resolve_subscriber(db, team_id, external_id)

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.subscriber_id == sub.id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(notification, field, value)

    await db.commit()
    await db.refresh(notification)
    return NotificationResponse.model_validate(notification)


@router.post("/subscribers/{external_id}/notifications/mark-all-read", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def mark_all_read(
    request: Request,
    external_id: str,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    sub = await _resolve_subscriber(db, team_id, external_id)

    await db.execute(
        update(Notification)
        .where(
            Notification.subscriber_id == sub.id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
