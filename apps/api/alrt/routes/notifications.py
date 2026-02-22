import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from alrt.config import settings
from alrt.db import execute_read_query, execute_read_one_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.notification import NotificationResponse, UpdateNotification
from alrt.queries import notifications as notif_q, subscribers as sub_q

router = APIRouter(tags=["notifications"])


async def _resolve_subscriber(team_id: uuid.UUID, external_id: str) -> dict:
    sub = await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, external_id])
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
    team_id: uuid.UUID = Depends(get_current_team),
):
    sub = await _resolve_subscriber(team_id, external_id)

    rows = await execute_read_query(
        notif_q.LIST_BY_SUBSCRIBER_FILTERED,
        [sub["id"], team_id, channel, is_read, limit, offset],
    )
    return [NotificationResponse.model_validate(row) for row in rows]


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
    team_id: uuid.UUID = Depends(get_current_team),
):
    sub = await _resolve_subscriber(team_id, external_id)

    notification = await execute_read_one_query(
        notif_q.FIND_BY_ID, [notification_id, sub["id"]]
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    updates = body.model_dump(exclude_unset=True)
    updated = None

    if "is_read" in updates:
        # execute_read_one_query works for UPDATE...RETURNING (uses fetchrow)
        updated = await execute_read_one_query(
            notif_q.UPDATE_READ_STATUS, [notification_id, updates["is_read"]]
        )

    if "is_archived" in updates:
        updated = await execute_read_one_query(
            notif_q.UPDATE_ARCHIVED_STATUS, [notification_id, updates["is_archived"]]
        )

    if updated is None:
        # No fields were updated; return the existing notification
        updated = notification

    return NotificationResponse.model_validate(updated)


@router.post("/subscribers/{external_id}/notifications/mark-all-read", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def mark_all_read(
    request: Request,
    external_id: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    sub = await _resolve_subscriber(team_id, external_id)
    await execute_update_query(notif_q.MARK_ALL_READ, [sub["id"]])
