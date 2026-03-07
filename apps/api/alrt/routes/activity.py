import math
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_read_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import activity as activity_q
from alrt.schemas.activity import ActivityFeedResponse, ActivityItem, ChannelStatus

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=ActivityFeedResponse)
@limiter.limit(settings.rate_limit_read)
async def get_activity_feed(
    request: Request,
    subscriber: str | None = Query(None),
    event_name: str | None = Query(None),
    status: str | None = Query(None),
    channel: str | None = Query(None),
    start_date: datetime | None = Query(None),
    end_date: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    team_id: uuid.UUID = Depends(get_current_team),
):
    offset = (page - 1) * per_page
    params = [team_id, subscriber, event_name, status, channel, start_date, end_date]

    rows = await execute_read_query(
        activity_q.LIST_ACTIVITY,
        params + [per_page, offset],
    )
    count_row = await execute_read_one_query(
        activity_q.COUNT_ACTIVITY,
        params,
    )
    total = count_row["total"] if count_row else 0
    total_pages = math.ceil(total / per_page) if total > 0 else 1

    items = []
    for row in rows:
        raw_channels = row["channels"] or []
        channel_statuses = [
            ChannelStatus(
                channel=ch["channel"],
                status=ch["status"],
                error_reason=ch.get("error_reason"),
            )
            for ch in raw_channels
        ]
        payload = row.get("event_payload")
        items.append(
            ActivityItem(
                execution_id=str(row["execution_id"]),
                created_at=row["created_at"].isoformat() if row["created_at"] else "",
                event_name=row.get("event_name"),
                workflow_name=row.get("workflow_name"),
                execution_status=row.get("execution_status"),
                event_payload=dict(payload) if payload else None,
                subscriber_name=row.get("subscriber_name"),
                subscriber_external_id=row.get("subscriber_external_id"),
                channels=channel_statuses,
                has_failure=bool(row.get("has_failure", False)),
            )
        )

    return ActivityFeedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )
