import math
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_read_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import event_logs as log_q
from alrt.schemas.event_log import EventLogListResponse, EventLogResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=EventLogListResponse)
@limiter.limit(settings.rate_limit_read)
async def list_logs(
    request: Request,
    method: str | None = None,
    path: str | None = None,
    status_min: int | None = None,
    status_max: int | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    team_id: uuid.UUID = Depends(get_current_team),
):
    offset = (page - 1) * per_page
    params = [team_id, method, path, status_min, status_max, start_date, end_date]

    count_row = await execute_read_one_query(log_q.COUNT, params)
    total = count_row["total"] if count_row else 0

    logs = await execute_read_query(log_q.LIST, params + [per_page, offset])

    return EventLogListResponse(
        logs=logs,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total else 0,
    )


@router.get("/{log_id}", response_model=EventLogResponse)
@limiter.limit(settings.rate_limit_read)
async def get_log(
    request: Request,
    log_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    log = await execute_read_one_query(log_q.GET_ONE, [log_id, team_id])
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log
