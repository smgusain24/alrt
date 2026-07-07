"""Event trigger endpoints.

These are the primary API entry points for sending notifications.
``POST /events/trigger`` fires a single workflow execution;
``POST /events/trigger-bulk`` accepts up to 10 000 subscribers, returns 202 with a
``batch_id``, and fans the work out to a worker — poll ``GET /events/batches/{id}``.
Both support idempotency keys, scheduled delivery, channel filtering,
and inline subscriber upsert.
"""

import asyncio
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Request

from alrt import celery_client
from alrt.config import settings
from alrt.db import execute_read_one_query, execute_insert_query
from alrt.deps import get_current_team, require_write
from alrt.middleware.rate_limit import limiter
from alrt.middleware.request_id import get_request_id
from alrt.queries import (
    workflows as wf_q,
    subscribers as sub_q,
    executions as exec_q,
    batches as batch_q,
)
from alrt.schemas.event import (
    TriggerEvent,
    TriggerResponse,
    TriggerBulkEvent,
    TriggerBulkResponse,
    BulkBatchStatus,
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


async def _enqueue_task(task_name: str, args: list) -> None:
    """Enqueue a worker task by name via the Celery producer.

    Runs the (blocking) Celery publish in a thread so the async handler's event loop
    isn't stalled. ``args`` must be JSON-serializable.
    """
    await asyncio.to_thread(celery_client.enqueue, task_name, args)


async def _enqueue_execution(execution_id: str) -> None:
    """Enqueue workflow.execute for one execution."""
    await _enqueue_task("alrt_workers.tasks.workflow.execute", [execution_id])


@router.post("/trigger", response_model=TriggerResponse, status_code=202)
@limiter.limit(settings.rate_limit_write)
async def trigger_event(
    request: Request,
    body: TriggerEvent,
    team_id: uuid.UUID = Depends(get_current_team),
    _: dict = Depends(require_write),
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

    # Idempotency key: prefer the standard header, fall back to the body field.
    idem_key = request.headers.get("Idempotency-Key") or body.idempotency_key
    cache_key = f"idempotency:{team_id}:{idem_key}" if idem_key else None

    # Open one Redis connection for the remainder of the handler
    r = aioredis.from_url(settings.redis_url)
    placeholder_set = False

    try:
        # Atomic idempotency guard using SET NX
        if cache_key:
            acquired = await r.set(cache_key, "pending", nx=True, ex=86400)
            if not acquired:
                existing = await r.get(cache_key)
                raw = existing.decode() if existing else ""
                try:
                    existing_id = uuid.UUID(raw)
                except ValueError:
                    # Still "pending": the original request is in flight. Don't
                    # fabricate an id — tell the client to retry.
                    raise HTTPException(status_code=409, detail="Duplicate request in progress; retry shortly")
                return TriggerResponse(event_id=existing_id, status="duplicate")
            placeholder_set = True

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
                idem_key,               # $8  idempotency_key
                deliver_at,             # $9  deliver_at
                body.metadata or {},    # $10 metadata
                exec_status,            # $11 status
                get_request_id(),       # $12 request_id (correlation)
            ],
        )
        if not execution:
            raise HTTPException(status_code=500, detail="Failed to create execution")

        # Promote the placeholder to the real execution id so retries replay it.
        if cache_key:
            await r.set(cache_key, str(execution["id"]), ex=86400)

        # Enqueue immediately only for running executions; scheduled ones are
        # picked up by the poller (GET_DUE_SCHEDULED + UPDATE_STATUS_TO_RUNNING)
        if exec_status == "running":
            await _enqueue_execution(str(execution["id"]))

    except Exception:
        # A failure after acquiring the placeholder would otherwise poison the key
        # for 24h and block legitimate retries — drop it so the client can retry.
        if placeholder_set and cache_key:
            await r.delete(cache_key)
        raise
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
    _: dict = Depends(require_write),
):
    """Trigger a workflow execution for many subscribers, asynchronously.

    Validates the batch, persists a ``bulk_batches`` row, and fans the work out to a
    Celery task — returning ``202 {batch_id}`` immediately instead of upserting and
    enqueuing every subscriber in-request (which timed out large batches and blasted
    duplicates on the SDK's auto-retry). The worker derives a per-subscriber
    idempotency key (``bulk:{batch_id}:{external_id}``) so a redelivered batch never
    double-sends. Poll ``GET /events/batches/{batch_id}`` for progress.
    """
    batch_id = uuid.uuid4()

    r = aioredis.from_url(settings.redis_url)
    bulk_cache_key = ""
    placeholder_set = False

    try:
        # Batch-level idempotency: a retried call with the same key returns the
        # original batch. Cleaned up on failure (below) so a failed attempt never
        # poisons the key for 24h.
        if body.idempotency_key:
            bulk_cache_key = f"idempotency:{team_id}:bulk:{body.idempotency_key}"
            acquired = await r.set(bulk_cache_key, "pending", nx=True, ex=86400)
            if not acquired:
                existing = await execute_read_one_query(
                    batch_q.FIND_BY_IDEMPOTENCY, [team_id, body.idempotency_key]
                )
                if existing:
                    return TriggerBulkResponse(
                        batch_id=existing["id"],
                        status="duplicate",
                        total=0,
                        accepted=0,
                        duplicates=1,
                        errors=0,
                    )
                # Key held but no batch persisted yet — the original is still in
                # flight. Don't fabricate a batch id; tell the client to retry.
                raise HTTPException(
                    status_code=409,
                    detail="A bulk trigger with this idempotency key is in progress; retry shortly",
                )
            placeholder_set = True

        # Look up the published workflow once for the whole batch.
        workflow = await execute_read_one_query(wf_q.FIND_PUBLISHED_BY_EVENT, [team_id, body.workflow])
        if not workflow:
            raise HTTPException(status_code=404, detail="No published workflow for this event")

        overrides = body.overrides.model_dump(exclude_none=True) if body.overrides else {}
        deliver_at = body.deliver_at
        if deliver_at and deliver_at.tzinfo is None:
            deliver_at = deliver_at.replace(tzinfo=timezone.utc)
        exec_status = "scheduled" if (deliver_at and deliver_at > datetime.now(timezone.utc)) else "running"

        total = len(body.subscribers)

        # Persist the batch so batch_id is pollable, then hand the work to a worker.
        await execute_insert_query(
            batch_q.CREATE,
            [batch_id, team_id, workflow["id"], body.idempotency_key, total, "pending"],
        )

        await _enqueue_task("alrt_workers.tasks.bulk.process_bulk_batch", [
            str(batch_id),                                 # batch_id
            str(team_id),                                  # team_id
            str(workflow["id"]),                           # workflow_id
            body.payload or {},                            # event_payload
            body.channels,                                 # channels
            overrides,                                     # overrides
            deliver_at.isoformat() if deliver_at else None,  # deliver_at (ISO or None)
            body.metadata or {},                           # metadata
            [s.model_dump() for s in body.subscribers],    # subscribers
            exec_status,                                   # status
            get_request_id(),                              # request_id (correlation)
        ])

        if body.idempotency_key:
            await r.set(bulk_cache_key, str(batch_id), ex=86400)

    except Exception:
        # Release the placeholder so a failed attempt (bad workflow, enqueue error)
        # doesn't lock this key out for 24h. Only delete a placeholder WE set — never
        # an in-flight original's key.
        if placeholder_set:
            await r.delete(bulk_cache_key)
        raise
    finally:
        await r.close()

    return TriggerBulkResponse(
        batch_id=batch_id,
        status="accepted",
        total=total,
        accepted=0,
        duplicates=0,
        errors=0,
    )


@router.get("/batches/{batch_id}", response_model=BulkBatchStatus)
@limiter.limit(settings.rate_limit_read)
async def get_bulk_batch(
    request: Request,
    batch_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    """Return the status of an async bulk trigger (team-scoped)."""
    row = await execute_read_one_query(batch_q.FIND_BY_ID, [batch_id, team_id])
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")
    return BulkBatchStatus(
        batch_id=row["id"],
        workflow_id=row["workflow_id"],
        total=row["total"],
        accepted=row["accepted"],
        errors=row["errors"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )
