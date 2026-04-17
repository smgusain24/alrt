"""Event trigger endpoints.

These are the primary API entry points for sending notifications.
``POST /events/trigger`` fires a single workflow execution;
``POST /events/trigger-bulk`` fires up to 1 000 executions in one call.
Both support idempotency keys, scheduled delivery, channel filtering,
and inline subscriber upsert.
"""

import json
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_insert_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import workflows as wf_q, subscribers as sub_q, executions as exec_q
from alrt.schemas.event import (
    TriggerEvent,
    TriggerResponse,
    TriggerBulkEvent,
    TriggerBulkResponse,
    SubscriberTriggerStatus,
    SubscriberInline,
)

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


def _get_subscriber_inline(body: TriggerEvent) -> SubscriberInline:
    """Return the canonical SubscriberInline from a TriggerEvent.

    Prefers the structured `subscriber` field; falls back to the deprecated
    `subscriber_id` string for backwards compatibility.
    """
    if body.subscriber is not None:
        return body.subscriber
    assert body.subscriber_id is not None  # guaranteed by model_validator
    return SubscriberInline(id=body.subscriber_id)


async def _resolve_subscriber(team_id: uuid.UUID, sub: SubscriberInline) -> dict:
    """Upsert a subscriber by external_id and return the DB row.

    Parameters map to sub_q.UPSERT_BY_EXTERNAL_ID:
        $1  team_id
        $2  external_id  (sub.id — the caller's own user identifier)
        $3  email
        $4  name
        $5  phone_number
        $6  discord_webhook_url  (None — inline subscriber does not set this)
        $7  telegram_chat_id     (None — inline subscriber does not set this)
        $8  custom_properties    (merged into existing via jsonb ||)
    """
    row = await execute_insert_query(
        sub_q.UPSERT_BY_EXTERNAL_ID,
        [
            team_id,         # $1  team_id
            sub.id,          # $2  external_id
            sub.email,       # $3  email
            sub.name,        # $4  name
            sub.phone,       # $5  phone_number
            None,            # $6  discord_webhook_url
            None,            # $7  telegram_chat_id
            sub.data or {},  # $8  custom_properties
        ],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to upsert subscriber")
    return row


async def _enqueue_execution(r: aioredis.Redis, execution_id: str) -> None:
    """Push a Celery v2 message onto the default queue for workflow.execute."""
    task_id = str(uuid.uuid4())
    task_message = json.dumps({
        "body": json.dumps((
            [execution_id],  # args
            {},              # kwargs
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
    await r.lpush("celery", task_message)  # pyright: ignore[reportGeneralTypeIssues]


@router.post("/trigger", response_model=TriggerResponse, status_code=202)
@limiter.limit(settings.rate_limit_write)
async def trigger_event(
    request: Request,
    body: TriggerEvent,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Trigger a single workflow execution for one subscriber.

    Resolves the subscriber (upserting if inline data is provided), looks up
    the published workflow by event name, creates an execution record, and
    enqueues it for immediate processing or marks it as scheduled.

    Idempotency is enforced via a Redis SET NX guard when
    ``idempotency_key`` is provided -- duplicate requests return the
    original execution ID with status ``"duplicate"``.
    """
    subscriber_inline = _get_subscriber_inline(body)

    # Look up published workflow
    workflow = await execute_read_one_query(wf_q.FIND_PUBLISHED_BY_EVENT, [team_id, body.workflow])
    if not workflow:
        raise HTTPException(status_code=404, detail="No published workflow for this event")

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

    # Open one Redis connection for the remainder of the handler
    r = aioredis.from_url(settings.redis_url)

    try:
        # Atomic idempotency check using SET NX
        if body.idempotency_key:
            cache_key = f"idempotency:{team_id}:{body.idempotency_key}"
            acquired = await r.set(cache_key, "pending", nx=True, ex=86400)
            if not acquired:
                # Key already existed — another request owns this idempotency_key
                existing = await r.get(cache_key)
                if existing:
                    raw = existing.decode()
                    try:
                        existing_id = uuid.UUID(raw)
                    except ValueError:
                        # Still "pending" (concurrent in-flight) — safe fallback
                        existing_id = uuid.uuid4()
                else:
                    existing_id = uuid.uuid4()
                return TriggerResponse(event_id=existing_id, status="duplicate")

        # Upsert subscriber
        subscriber = await _resolve_subscriber(team_id, subscriber_inline)

        # Determine execution status
        now_utc = datetime.now(timezone.utc)
        deliver_at = body.deliver_at
        if deliver_at and deliver_at.tzinfo is None:
            deliver_at = deliver_at.replace(tzinfo=timezone.utc)

        if deliver_at and deliver_at > now_utc:
            exec_status = "scheduled"
        else:
            exec_status = "running"

        # Create execution record (11 params)
        execution_id = uuid.uuid4()
        execution = await execute_insert_query(
            exec_q.CREATE,
            [
                execution_id,           # $1  id
                team_id,                # $2  team_id
                workflow["id"],         # $3  workflow_id
                subscriber["id"],       # $4  subscriber_id
                body.payload or {},     # $5  event_payload
                body.channels,          # $6  channels
                overrides,              # $7  overrides
                body.idempotency_key,   # $8  idempotency_key
                deliver_at,             # $9  deliver_at
                body.metadata or {},    # $10 metadata
                exec_status,            # $11 status
            ],
        )
        if not execution:
            raise HTTPException(status_code=500, detail="Failed to create execution")

        # Promote idempotency placeholder to real execution id
        if body.idempotency_key:
            cache_key = f"idempotency:{team_id}:{body.idempotency_key}"
            await r.set(cache_key, str(execution["id"]), ex=86400)

        # Enqueue immediately only for running executions; scheduled ones are
        # picked up by the poller (GET_DUE_SCHEDULED + UPDATE_STATUS_TO_RUNNING)
        if exec_status == "running":
            await _enqueue_execution(r, str(execution["id"]))

    finally:
        await r.close()

    return TriggerResponse(
        event_id=execution["id"],
        status=exec_status,
        channels_requested=list(channels_requested) if channels_requested else None,
        channels_matched=channels_matched,
        warnings=warnings,
        scheduled_at=execution["deliver_at"] if exec_status == "scheduled" else None,
    )


@router.post("/trigger-bulk", response_model=TriggerBulkResponse, status_code=202)
@limiter.limit(settings.rate_limit_write)
async def trigger_event_bulk(
    request: Request,
    body: TriggerBulkEvent,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Trigger a workflow execution for multiple subscribers in one request.

    Processes each subscriber sequentially, upserting and creating an
    execution per subscriber.  Per-subscriber failures are captured in the
    response rather than aborting the entire batch.  Batch-level
    idempotency is supported via ``idempotency_key``.
    """
    batch_id = uuid.uuid4()

    # Open one Redis connection for the whole batch
    r = aioredis.from_url(settings.redis_url)
    bulk_cache_key = ""

    try:
        # Batch-level idempotency check
        if body.idempotency_key:
            bulk_cache_key = f"idempotency:{team_id}:bulk:{body.idempotency_key}"
            acquired = await r.set(bulk_cache_key, "pending", nx=True, ex=86400)
            if not acquired:
                return TriggerBulkResponse(
                    batch_id=batch_id,
                    status="duplicate",
                    total=0,
                    accepted=0,
                    duplicates=1,
                    errors=0,
                    results=[],
                )

        # Look up published workflow once for the whole batch
        workflow = await execute_read_one_query(wf_q.FIND_PUBLISHED_BY_EVENT, [team_id, body.workflow])
        if not workflow:
            raise HTTPException(status_code=404, detail="No published workflow for this event")

        overrides = body.overrides.model_dump(exclude_none=True) if body.overrides else {}
        now_utc = datetime.now(timezone.utc)
        deliver_at = body.deliver_at
        if deliver_at and deliver_at.tzinfo is None:
            deliver_at = deliver_at.replace(tzinfo=timezone.utc)

        if deliver_at and deliver_at > now_utc:
            exec_status = "scheduled"
        else:
            exec_status = "running"

        results: list[SubscriberTriggerStatus] = []
        accepted = 0
        errors = 0

        for sub in body.subscribers:
            try:
                subscriber = await _resolve_subscriber(team_id, sub)

                execution_id = uuid.uuid4()
                execution = await execute_insert_query(
                    exec_q.CREATE,
                    [
                        execution_id,           # $1  id
                        team_id,                # $2  team_id
                        workflow["id"],         # $3  workflow_id
                        subscriber["id"],       # $4  subscriber_id
                        body.payload or {},     # $5  event_payload
                        body.channels,          # $6  channels
                        overrides,              # $7  overrides
                        None,                   # $8  idempotency_key (per-subscriber keys not supported in bulk)
                        deliver_at,             # $9  deliver_at
                        body.metadata or {},    # $10 metadata
                        exec_status,            # $11 status
                    ],
                )
                if not execution:
                    raise RuntimeError("Failed to create execution record")

                if exec_status == "running":
                    await _enqueue_execution(r, str(execution["id"]))

                results.append(SubscriberTriggerStatus(
                    subscriber_id=sub.id,
                    event_id=execution["id"],
                    status="accepted",
                ))
                accepted += 1

            except Exception as e:
                results.append(SubscriberTriggerStatus(
                    subscriber_id=sub.id,
                    status="error",
                    error=str(e),
                ))
                errors += 1

        # Finalise batch idempotency key
        if body.idempotency_key:
            await r.set(bulk_cache_key, str(batch_id), ex=86400)

    finally:
        await r.close()

    return TriggerBulkResponse(
        batch_id=batch_id,
        status="accepted",
        total=len(body.subscribers),
        accepted=accepted,
        duplicates=0,
        errors=errors,
        results=results,
    )
