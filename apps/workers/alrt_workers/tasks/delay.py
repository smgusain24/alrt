"""Beat-driven poller for delay node resumption and scheduled workflow executions."""

import json
import os
import uuid
from datetime import datetime, timezone

import redis as sync_redis

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_query, execute_read_one_query, execute_update_query

# Queries — scheduled_steps (delay node resumption)
Q_GET_DUE_STEPS = """
    SELECT id, workflow_execution_id, next_step_id, payload, scheduled_at, status
    FROM scheduled_steps
    WHERE status = 'pending' AND scheduled_at <= $1
"""
Q_UPDATE_STEP_STATUS = "UPDATE scheduled_steps SET status = $2, updated_at = now() WHERE id = $1"

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
    """Push a Celery v2 protocol message directly onto the Redis queue.

    Bypasses celery_app.send_task to avoid import-time circular dependencies
    between the delay poller and the workflow task module.

    Args:
        execution_id: UUID string of the workflow execution to enqueue.
    """
    redis_url = os.environ["REDIS_URL"]
    r = sync_redis.from_url(redis_url)
    try:
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
        r.lpush("celery", task_message)
    finally:
        r.close()


@celery_app.task
def poll_scheduled_steps():
    """Poll for due scheduled steps and deliver_at executions.

    Runs every 30 seconds via Celery Beat. Handles two cases:
    1. Delay node resumption -- picks up scheduled_steps rows whose
       scheduled_at has passed and re-enters step_runner.execute_step.
    2. Scheduled executions -- picks up workflow_executions with status
       'scheduled' whose deliver_at has passed, marks them 'running',
       and enqueues the workflow.execute task.
    """
    now = datetime.now(timezone.utc)

    # --- existing: delay node resumption ---
    due_steps = execute_read_query(Q_GET_DUE_STEPS, [now])

    for step in due_steps:
        execute_update_query(Q_UPDATE_STEP_STATUS, [step["id"], "processing"])

        payload = dict(step["payload"] or {})
        subscriber_id = payload.pop("__subscriber_id", None)
        team_id = payload.pop("__team_id", None)

        preferences = {}
        if subscriber_id:
            sub = execute_read_one_query(
                "SELECT channel_preferences FROM subscribers WHERE id = $1",
                [uuid.UUID(subscriber_id)]
            )
            if sub:
                preferences = sub.get("channel_preferences") or {}

        from alrt_workers.tasks.step_runner import execute_step
        execute_step(
            str(step["workflow_execution_id"]),
            {"id": step["next_step_id"], "type": "resume"},
            subscriber_id,
            team_id,
            payload,
            preferences,
        )

        execute_update_query(Q_UPDATE_STEP_STATUS, [step["id"], "completed"])

    # --- new: scheduled executions (deliver_at on trigger) ---
    due_executions = execute_read_query(Q_GET_DUE_SCHEDULED, [now])

    for exec_row in due_executions:
        # Atomically mark as running — prevents double-enqueue across concurrent pollers
        updated = execute_update_query(Q_UPDATE_STATUS_TO_RUNNING, [exec_row["id"]])
        if not updated:
            continue  # already claimed by another poller instance
        _enqueue_workflow_task(str(exec_row["id"]))
