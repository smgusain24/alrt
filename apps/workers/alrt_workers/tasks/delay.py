import uuid
from datetime import datetime, timezone

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_query, execute_update_query

# Queries
Q_GET_DUE_STEPS = """
    SELECT id, workflow_execution_id, next_step_id, payload, scheduled_at, status
    FROM scheduled_steps
    WHERE status = 'pending' AND scheduled_at <= $1
"""
Q_UPDATE_STEP_STATUS = "UPDATE scheduled_steps SET status = $2, updated_at = now() WHERE id = $1"


@celery_app.task
def poll_scheduled_steps():
    due_steps = execute_read_query(Q_GET_DUE_STEPS, [datetime.now(timezone.utc)])

    for step in due_steps:
        execute_update_query(Q_UPDATE_STEP_STATUS, [step["id"], "processing"])

        from alrt_workers.tasks.step_runner import execute_step
        # Resume workflow from the delayed step
        execute_step(
            str(step["workflow_execution_id"]),
            {"id": step["next_step_id"], "type": "resume"},
            None,
            None,
            step["payload"] or {},
            {},
        )

        execute_update_query(Q_UPDATE_STEP_STATUS, [step["id"], "completed"])
