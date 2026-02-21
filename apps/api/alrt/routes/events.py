import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alrt.config import settings
from alrt.deps import get_db, get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.event import TriggerEvent, TriggerResponse
from alrt_db.models.subscriber import Subscriber
from alrt_db.models.workflow import Workflow
from alrt_db.models.workflow_execution import WorkflowExecution

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/trigger", response_model=TriggerResponse, status_code=202)
@limiter.limit(settings.rate_limit_write)
async def trigger_event(
    request: Request,
    body: TriggerEvent,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    # Idempotency check
    if body.idempotency_key:
        r = aioredis.from_url(settings.redis_url)
        cache_key = f"idempotency:{team_id}:{body.idempotency_key}"
        existing = await r.get(cache_key)
        if existing:
            return TriggerResponse(event_id=uuid.UUID(existing.decode()), status="duplicate")
        await r.close()

    # Look up workflow
    result = await db.execute(
        select(Workflow).where(
            Workflow.team_id == team_id,
            Workflow.event_name == body.workflow,
            Workflow.status == "published",
        )
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="No published workflow for this event")

    # Look up subscriber
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.team_id == team_id,
            Subscriber.external_id == body.subscriber_id,
            Subscriber.is_deleted == False,
        )
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Create execution record
    execution = WorkflowExecution(
        team_id=team_id,
        workflow_id=workflow.id,
        subscriber_id=subscriber.id,
        event_payload=body.payload,
        idempotency_key=body.idempotency_key,
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    # Store idempotency key
    if body.idempotency_key:
        r = aioredis.from_url(settings.redis_url)
        cache_key = f"idempotency:{team_id}:{body.idempotency_key}"
        await r.set(cache_key, str(execution.id), ex=86400)
        await r.close()

    # TODO: Enqueue Celery task: workflow.execute(execution.id)

    return TriggerResponse(event_id=execution.id)
