"""Beat-driven poller for delay node resumption and scheduled workflow executions."""

import uuid
from datetime import datetime, timezone

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_query, execute_update_query

# Queries — scheduled_steps (delay/DND resumption)
# Claim due steps in one statement: FOR UPDATE SKIP LOCKED lets overlapping polls take
# disjoint batches without blocking each other, and the RETURNING set is exactly what
# gets fanned out. Each claimed step is then handled by its own resume_scheduled_step
# task rather than inline, so a backlog doesn't serialize on the Beat thread.
Q_CLAIM_DUE_STEPS = """
    UPDATE scheduled_steps SET status = 'processing', updated_at = now()
    WHERE id IN (
        SELECT id FROM scheduled_steps
        WHERE status = 'pending' AND scheduled_at <= $1
        ORDER BY scheduled_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id, workflow_execution_id, next_step_id
"""
Q_UPDATE_STEP_STATUS = "UPDATE scheduled_steps SET status = $2, updated_at = now() WHERE id = $1"

# Bounded claim per tick so a large backlog drains in batches rather than one giant txn.
CLAIM_BATCH_SIZE = 100

# Queries — scheduled executions (deliver_at on trigger)
Q_GET_DUE_SCHEDULED = """
    SELECT id FROM workflow_executions
    WHERE status = 'scheduled' AND deliver_at <= $1
    ORDER BY deliver_at ASC
    LIMIT 100
"""
Q_UPDATE_STATUS_TO_RUNNING = """
    UPDATE workflow_executions SET status = 'running', updated_at = now()
    WHERE id = $1 AND status = 'scheduled'
"""


def _enqueue_workflow_task(execution_id: str) -> None:
    """Enqueue workflow.execute by name via the Celery producer.

    Sending by task name avoids importing the workflow task module (the original
    circular-import motivation) while letting Celery build the message envelope.

    Args:
        execution_id: UUID string of the workflow execution to enqueue.
    """
    celery_app.send_task("alrt_workers.tasks.workflow.execute", args=[execution_id])


@celery_app.task
def resume_scheduled_step(step_id, execution_id, next_step_id):
    """Resume one already-claimed scheduled step (delay/DND), then finalize.

    Fanned out by poll_scheduled_steps so resumes run in parallel across the worker
    pool instead of serially on the Beat thread. The step is already 'processing'
    (the poller claimed it); we run the resume, mark the step 'completed' *before*
    finalizing so it doesn't hold the execution open, then check for completion. A
    crash here leaves the step 'processing' for the reconciler to reset to 'pending'.

    Args:
        step_id: UUID string of the scheduled_steps row.
        execution_id: UUID string of the owning workflow execution.
        next_step_id: node id to resume from (delay node re-walks its children;
            a DND-deferred channel node re-runs itself).
    """
    # Lazy import avoids an import-time cycle with the workflow task module.
    from alrt_workers.tasks.workflow import resume_from, maybe_complete

    resume_from(execution_id, next_step_id)
    execute_update_query(Q_UPDATE_STEP_STATUS, [uuid.UUID(step_id), "completed"])
    maybe_complete(uuid.UUID(execution_id))


@celery_app.task
def poll_scheduled_steps():
    """Poll for due scheduled steps and deliver_at executions.

    Runs every 30 seconds via Celery Beat. Handles two cases:
    1. Delay/DND resumption -- claims a bounded batch of due scheduled_steps with
       FOR UPDATE SKIP LOCKED and fans each out as its own resume_scheduled_step task.
    2. Scheduled executions -- picks up workflow_executions with status 'scheduled'
       whose deliver_at has passed, marks them 'running', and enqueues workflow.execute.
    """
    now = datetime.now(timezone.utc)

    # --- delay / DND resumption: claim a bounded batch atomically, then fan out ---
    claimed = execute_read_query(Q_CLAIM_DUE_STEPS, [now, CLAIM_BATCH_SIZE])
    for step in claimed:
        resume_scheduled_step.delay(
            str(step["id"]),
            str(step["workflow_execution_id"]),
            step["next_step_id"],
        )

    # --- scheduled executions (deliver_at on trigger) ---
    due_executions = execute_read_query(Q_GET_DUE_SCHEDULED, [now])

    for exec_row in due_executions:
        # Atomically mark as running — prevents double-enqueue across concurrent pollers
        updated = execute_update_query(Q_UPDATE_STATUS_TO_RUNNING, [exec_row["id"]])
        if not updated:
            continue  # already claimed by another poller instance
        _enqueue_workflow_task(str(exec_row["id"]))
