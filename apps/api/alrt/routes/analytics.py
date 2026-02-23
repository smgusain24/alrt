import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, Request

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_read_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import analytics as a_q
from alrt.schemas.analytics import (
    AnalyticsDeliveryResponse,
    AnalyticsOverviewResponse,
    AnalyticsTimelineResponse,
    AnalyticsWorkflowsResponse,
    ChannelMetrics,
    OverviewMetrics,
    TimelinePoint,
    WorkflowMetrics,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _get_start_date(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


@router.get("/overview", response_model=AnalyticsOverviewResponse)
@limiter.limit(settings.rate_limit_read)
async def get_overview(
    request: Request,
    days: int = Query(30, ge=1, le=90),
    team_id: uuid.UUID = Depends(get_current_team),
):
    start_date = _get_start_date(days)
    row = await execute_read_one_query(a_q.OVERVIEW_METRICS, [team_id, start_date])
    
    metrics = OverviewMetrics(
        total_sent=row["total_sent"] if row else 0,
        total_failed=row["total_failed"] if row else 0,
        total_pending=row["total_pending"] if row else 0,
    )
    return AnalyticsOverviewResponse(metrics=metrics, days=days)


@router.get("/delivery", response_model=AnalyticsDeliveryResponse)
@limiter.limit(settings.rate_limit_read)
async def get_delivery(
    request: Request,
    days: int = Query(30, ge=1, le=90),
    team_id: uuid.UUID = Depends(get_current_team),
):
    start_date = _get_start_date(days)
    rows = await execute_read_query(a_q.DELIVERY_BY_CHANNEL, [team_id, start_date])
    
    channels = []
    for r in rows:
        total = r["sent"] + r["failed"] + r["pending"]
        rate = (r["sent"] / total * 100) if total > 0 else 0
        channels.append(ChannelMetrics(
            channel=r["channel"],
            sent=r["sent"],
            failed=r["failed"],
            pending=r["pending"],
            success_rate=rate,
        ))
        
    return AnalyticsDeliveryResponse(channels=channels, days=days)


@router.get("/workflows", response_model=AnalyticsWorkflowsResponse)
@limiter.limit(settings.rate_limit_read)
async def get_workflows(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    rows = await execute_read_query(a_q.WORKFLOW_METRICS, [team_id])
    
    workflows = []
    for r in rows:
        total = r["total_executions"]
        rate = (r["success_executions"] / total * 100) if total > 0 else 0
        workflows.append(WorkflowMetrics(
            workflow_id=str(r["workflow_id"]),
            workflow_name=r["workflow_name"],
            total_executions=total,
            success_executions=r["success_executions"],
            failed_executions=r["failed_executions"],
            success_rate=rate,
            avg_duration_ms=(r["avg_duration_s"] * 1000) if r["avg_duration_s"] else 0,
        ))
        
    return AnalyticsWorkflowsResponse(workflows=workflows)


@router.get("/notifications/timeline", response_model=AnalyticsTimelineResponse)
@limiter.limit(settings.rate_limit_read)
async def get_timeline(
    request: Request,
    days: int = Query(30, ge=1, le=90),
    team_id: uuid.UUID = Depends(get_current_team),
):
    start_date = _get_start_date(days)
    rows = await execute_read_query(a_q.NOTIFICATION_TIMELINE, [team_id, start_date])
    
    timeline = []
    for r in rows:
        timeline.append(TimelinePoint(
            date=r["date"].isoformat() if r["date"] else "",
            sent=r["sent"],
            failed=r["failed"],
        ))
        
    return AnalyticsTimelineResponse(timeline=timeline, days=days)
