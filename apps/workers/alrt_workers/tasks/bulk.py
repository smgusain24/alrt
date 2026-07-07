"""Async bulk trigger: fan a validated batch out into per-subscriber executions.

The API validates the batch, persists a ``bulk_batches`` row, and enqueues this task,
returning 202 immediately. Here we upsert each subscriber, create an execution with a
derived idempotency key (``bulk:{batch_id}:{external_id}``) so a redelivered batch
never double-sends, enqueue ``workflow.execute`` for new running executions, and record
progress on the batch row so ``GET /events/batches/{id}`` stays meaningful.
"""

import logging
import uuid
from datetime import datetime

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_insert_query, execute_update_query
from alrt_workers.tasks.delay import _enqueue_workflow_task

logger = logging.getLogger("alrt.workers.bulk")

# Mirrors alrt.queries.subscribers.UPSERT_BY_EXTERNAL_ID (workers keep their own SQL).
Q_UPSERT_SUBSCRIBER = """
    INSERT INTO subscribers (
        id, team_id, external_id, email, name, phone_number,
        discord_webhook_url, telegram_chat_id, custom_properties
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (team_id, external_id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, subscribers.email),
        name = COALESCE(EXCLUDED.name, subscribers.name),
        phone_number = COALESCE(EXCLUDED.phone_number, subscribers.phone_number),
        custom_properties = subscribers.custom_properties || COALESCE(EXCLUDED.custom_properties, '{}'),
        updated_at = now()
    RETURNING id
"""

# Derived-key insert: a redelivered batch (acks_late) hits the unique constraint and
# DO NOTHING returns no row, so the execution is created — and enqueued — exactly once.
Q_CREATE_EXECUTION = """
    INSERT INTO workflow_executions
        (id, team_id, workflow_id, subscriber_id, event_payload, channels, overrides,
         idempotency_key, deliver_at, metadata, status, request_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (team_id, idempotency_key) DO NOTHING
    RETURNING id
"""

Q_UPDATE_BATCH = """
    UPDATE bulk_batches SET accepted = $2, errors = $3, status = $4, updated_at = now()
    WHERE id = $1
"""

# Flush progress to the batch row every this many subscribers so status is pollable.
CHUNK_SIZE = 100


@celery_app.task
def process_bulk_batch(batch_id, team_id, workflow_id, event_payload, channels,
                       overrides, deliver_at, metadata, subscribers, exec_status,
                       request_id=None):
    """Create one execution per subscriber and enqueue delivery.

    Args:
        batch_id: UUID string of the bulk_batches row to update with progress.
        team_id, workflow_id: UUID strings.
        event_payload, overrides, metadata: JSON dicts passed through to each execution.
        channels: optional list of channel names (or None).
        deliver_at: ISO-8601 string for scheduled delivery, or None for immediate.
        subscribers: list of inline-subscriber dicts ({id, email, name, phone, data}).
        exec_status: 'running' (enqueue now) or 'scheduled' (poller enqueues at deliver_at).
        request_id: correlation id from the originating API request (or None).
    """
    team_uuid = uuid.UUID(team_id)
    workflow_uuid = uuid.UUID(workflow_id)
    deliver_at_dt = datetime.fromisoformat(deliver_at) if deliver_at else None

    accepted = 0
    errors = 0

    for i, sub in enumerate(subscribers, start=1):
        try:
            external_id = sub["id"]
            subscriber = execute_insert_query(Q_UPSERT_SUBSCRIBER, [
                team_uuid,               # $1 team_id
                external_id,             # $2 external_id
                sub.get("email"),        # $3 email
                sub.get("name"),         # $4 name
                sub.get("phone"),        # $5 phone_number
                None,                    # $6 discord_webhook_url
                None,                    # $7 telegram_chat_id
                sub.get("data") or {},   # $8 custom_properties
            ])
            if not subscriber:
                errors += 1
                continue

            execution = execute_insert_query(Q_CREATE_EXECUTION, [
                uuid.uuid4(),                          # $1  id
                team_uuid,                             # $2  team_id
                workflow_uuid,                         # $3  workflow_id
                subscriber["id"],                      # $4  subscriber_id
                event_payload or {},                   # $5  event_payload
                channels,                              # $6  channels
                overrides or {},                       # $7  overrides
                f"bulk:{batch_id}:{external_id}",      # $8  idempotency_key (derived)
                deliver_at_dt,                         # $9  deliver_at
                metadata or {},                        # $10 metadata
                exec_status,                           # $11 status
                request_id,                            # $12 request_id (correlation)
            ])
            # None => this subscriber's execution already exists from a prior run.
            if execution is not None and exec_status == "running":
                _enqueue_workflow_task(str(execution["id"]))
            accepted += 1
        except Exception:
            logger.exception("bulk batch %s: subscriber %s failed", batch_id, sub.get("id"))
            errors += 1

        if i % CHUNK_SIZE == 0:
            execute_update_query(Q_UPDATE_BATCH, [uuid.UUID(batch_id), accepted, errors, "processing"])

    execute_update_query(Q_UPDATE_BATCH, [uuid.UUID(batch_id), accepted, errors, "completed"])
    logger.info("bulk batch %s done: accepted=%d errors=%d", batch_id, accepted, errors)
    return {"batch_id": batch_id, "accepted": accepted, "errors": errors}
