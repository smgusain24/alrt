import json
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_insert_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import workflows as wf_q, subscribers as sub_q, executions as exec_q
from alrt.schemas.event import TriggerEvent, TriggerResponse

router = APIRouter(prefix="/events", tags=["events"])


def _get_workflow_channels(definition: dict) -> set[str]:
    """Extract channel names from workflow definition nodes."""
    channels = set()
    for node in definition.get("nodes", []):
        if node.get("type") == "channel":
            ch = node.get("data", {}).get("channel")
            if ch:
                channels.add(ch)
    return channels


@router.post("/trigger", response_model=TriggerResponse, status_code=202)
@limiter.limit(settings.rate_limit_write)
async def trigger_event(
    request: Request,
    body: TriggerEvent,
    team_id: uuid.UUID = Depends(get_current_team),
):
    # Idempotency check
    if body.idempotency_key:
        r = aioredis.from_url(settings.redis_url)
        cache_key = f"idempotency:{team_id}:{body.idempotency_key}"
        existing = await r.get(cache_key)
        if existing:
            await r.close()
            return TriggerResponse(event_id=uuid.UUID(existing.decode()), status="duplicate")
        await r.close()

    # Look up published workflow
    workflow = await execute_read_one_query(wf_q.FIND_PUBLISHED_BY_EVENT, [team_id, body.workflow])
    if not workflow:
        raise HTTPException(status_code=404, detail="No published workflow for this event")

    # Look up subscriber
    subscriber = await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, body.subscriber_id])
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    # Channel validation and warnings
    warnings = []
    channels_requested = None
    channels_matched = None

    if body.channels:
        channels_requested = body.channels
        workflow_channels = _get_workflow_channels(workflow["definition"] or {})
        matched = [ch for ch in body.channels if ch in workflow_channels]
        unmatched = [ch for ch in body.channels if ch not in workflow_channels]
        channels_matched = matched

        for ch in unmatched:
            warnings.append(f"Channel '{ch}' has no step in workflow '{body.workflow}'")

    overrides = body.overrides.model_dump(exclude_none=True) if body.overrides else {}

    # Create execution record
    execution_id = uuid.uuid4()
    execution = await execute_insert_query(
        exec_q.CREATE,
        [
            execution_id,
            team_id,
            workflow["id"],
            subscriber["id"],
            body.payload or {},
            body.channels,
            overrides,
            body.idempotency_key,
        ],
    )
    if not execution:
        raise HTTPException(status_code=500, detail="Failed to create execution")

    # Store idempotency key
    if body.idempotency_key:
        r = aioredis.from_url(settings.redis_url)
        cache_key = f"idempotency:{team_id}:{body.idempotency_key}"
        await r.set(cache_key, str(execution["id"]), ex=86400)
        await r.close()

    # Enqueue Celery task via Redis (Celery v2 message protocol)
    import json as _json
    task_id = str(uuid.uuid4())
    r = aioredis.from_url(settings.redis_url)
    task_message = _json.dumps({
        "body": _json.dumps((
            [str(execution["id"])],  # args
            {},                       # kwargs
            {"callbacks": None, "errbacks": None, "chain": None, "chord": None},
        )),
        "content-encoding": "utf-8",
        "content-type": "application/json",
        "headers": {
            "lang": "py",
            "task": "alrt_workers.tasks.workflow.execute",
            "id": task_id,
            "root_id": task_id,
            "parent_id": None,
            "group": None,
        },
        "properties": {
            "correlation_id": task_id,
            "reply_to": "",
            "delivery_mode": 2,
            "delivery_info": {"exchange": "", "routing_key": "celery"},
            "priority": 0,
            "body_encoding": "utf-8",
            "delivery_tag": task_id,
        },
    })
    await r.lpush("celery", task_message)
    await r.close()

    return TriggerResponse(
        event_id=execution["id"],
        channels_requested=list(channels_requested) if channels_requested else None,
        channels_matched=channels_matched,
        warnings=warnings,
    )
