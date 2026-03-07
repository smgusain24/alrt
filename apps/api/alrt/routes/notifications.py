import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from alrt.config import settings
from alrt.db import execute_read_query, execute_read_one_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.notification import NotificationResponse, UpdateNotification, DeadLetterResponse, DeadLetterListResponse
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


@router.get("/notifications/dead-letter", response_model=DeadLetterListResponse)
@limiter.limit(settings.rate_limit_read)
async def list_dead_letter(
    request: Request,
    channel: str | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    team_id: uuid.UUID = Depends(get_current_team),
):
    rows = await execute_read_query(
        notif_q.LIST_DEAD_LETTER,
        [team_id, channel, limit, offset],
    )
    count_row = await execute_read_one_query(
        notif_q.COUNT_DEAD_LETTER,
        [team_id],
    )
    total = count_row["total"] if count_row else 0
    return DeadLetterListResponse(
        items=[DeadLetterResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.post("/notifications/{notification_id}/retry", response_model=DeadLetterResponse)
@limiter.limit(settings.rate_limit_write)
async def retry_dead_letter(
    request: Request,
    notification_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    # Reset status and re-enqueue
    row = await execute_read_one_query(
        notif_q.RETRY_DEAD_LETTER,
        [notification_id, team_id],
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dead letter notification not found")

    # Re-enqueue the delivery task to the appropriate channel queue
    import json
    import redis.asyncio as aioredis
    from alrt.config import settings as app_settings

    channel = row["channel"]
    task_map = {
        "email": "alrt_workers.tasks.channels.email.deliver",
        "slack": "alrt_workers.tasks.channels.slack.deliver",
        "in_app": "alrt_workers.tasks.channels.inapp.deliver",
        "whatsapp": "alrt_workers.tasks.channels.whatsapp.deliver",
        "discord": "alrt_workers.tasks.channels.discord.deliver",
        "telegram": "alrt_workers.tasks.channels.telegram.deliver",
    }
    task_name = task_map.get(channel)
    if not task_name:
        raise HTTPException(status_code=400, detail=f"Unknown channel: {channel}")

    # Queue routing matches SCALE-01 config
    queue_map = {
        "email": "email",
        "slack": "slack",
        "in_app": "inapp",
        "whatsapp": "whatsapp",
        "discord": "discord",
        "telegram": "telegram",
    }
    queue_name = queue_map.get(channel, "celery")

    task_id = str(uuid.uuid4())
    task_message = json.dumps({
        "body": json.dumps((
            [
                str(row["workflow_execution_id"]),
                str(row["subscriber_id"]),
                str(row["team_id"]),
                {},
                row.get("payload") or {},
            ],
            {"notification_id": str(notification_id)},
            {"callbacks": None, "errbacks": None, "chain": None, "chord": None},
        )),
        "content-encoding": "utf-8",
        "content-type": "application/json",
        "headers": {
            "lang": "py",
            "task": task_name,
            "id": task_id,
            "root_id": task_id,
            "parent_id": None,
            "group": None,
        },
        "properties": {
            "correlation_id": task_id,
            "reply_to": "",
            "delivery_mode": 2,
            "delivery_info": {"exchange": "", "routing_key": queue_name},
            "priority": 0,
            "body_encoding": "utf-8",
            "delivery_tag": task_id,
        },
    })

    r = aioredis.from_url(app_settings.redis_url)
    try:
        await r.lpush(queue_name, task_message)  # pyright: ignore[reportGeneralTypeIssues]
    finally:
        await r.close()

    return DeadLetterResponse.model_validate(row)
