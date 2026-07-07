"""Workflow execution: BFS graph walk backed by a per-node step-execution ledger.

The ledger (`step_executions`, unique on execution+node) makes the walk idempotent:
each node is claimed once via INSERT ... ON CONFLICT DO NOTHING, so an acks_late
redelivery of `execute` re-walks the graph without re-dispatching or duplicating
notifications. It also enables resume — a delay/DND node pauses the walk, and the
Beat poller later calls `resume_from` to continue from where it stopped.
"""

import uuid
import logging

from alrt_workers.celery_app import celery_app
from alrt_workers.db import (
    execute_insert_query,
    execute_read_one_query,
    execute_update_query,
)
from alrt_workers.serialization import json_safe

logger = logging.getLogger("alrt.workers.workflow")


class _BoundLogger(logging.LoggerAdapter):
    """Prefixes every log line with the request + execution correlation ids so a
    delivery can be traced back to the originating API request, regardless of the
    (Celery-default) log formatter."""

    def process(self, msg, kwargs):
        extra = self.extra or {}
        return f"[req={extra.get('request_id')} exec={extra.get('execution_id')}] {msg}", kwargs


def _bind_logger(execution):
    return _BoundLogger(logger, {
        "request_id": execution.get("request_id"),
        "execution_id": execution["id"],
    })


Q_GET_EXECUTION = "SELECT id, team_id, workflow_id, subscriber_id, event_payload, channels, overrides, status, request_id FROM workflow_executions WHERE id = $1"
Q_GET_WORKFLOW = "SELECT id, team_id, name, event_name, category, definition, status FROM workflows WHERE id = $1"
# Superset of every field any channel reads, so the snapshot threaded to channel
# tasks (below) is complete and they can skip re-fetching the subscriber.
Q_GET_SUBSCRIBER = "SELECT id, team_id, external_id, email, name, slack_user_id, phone_number, discord_webhook_url, telegram_chat_id, push_tokens, custom_properties, channel_preferences FROM subscribers WHERE id = $1 AND is_deleted = false"
Q_UPDATE_EXECUTION_STATUS = "UPDATE workflow_executions SET status = $2, updated_at = now() WHERE id = $1"

# Step-execution ledger
Q_CLAIM_STEP = """
    INSERT INTO step_executions (id, workflow_execution_id, node_id, status)
    VALUES ($1, $2, $3, 'running')
    ON CONFLICT (workflow_execution_id, node_id) DO NOTHING
    RETURNING id
"""
Q_GET_STEP_STATUS = "SELECT status FROM step_executions WHERE workflow_execution_id = $1 AND node_id = $2"
Q_SET_STEP_STATUS = "UPDATE step_executions SET status = $3, attempt = attempt + 1, updated_at = now() WHERE workflow_execution_id = $1 AND node_id = $2"
Q_DELETE_STEP = "DELETE FROM step_executions WHERE workflow_execution_id = $1 AND node_id = $2"
Q_HAS_OPEN_STEPS = "SELECT 1 FROM scheduled_steps WHERE workflow_execution_id = $1 AND status IN ('pending', 'processing') LIMIT 1"
Q_HAS_OPEN_LEDGER = "SELECT 1 FROM step_executions WHERE workflow_execution_id = $1 AND status = 'running' LIMIT 1"


def _load_context(execution):
    """Load the workflow + subscriber and build graph lookups for an execution.

    Returns a dict with workflow, subscriber, node_map, children_map — or None if
    the workflow or subscriber is missing (caller should mark the execution failed).
    """
    workflow = execute_read_one_query(Q_GET_WORKFLOW, [execution["workflow_id"]])
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [execution["subscriber_id"]])
    if not workflow or not subscriber:
        return None

    definition = workflow["definition"] or {}
    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])

    children_map: dict[str, list[str]] = {}
    for edge in edges:
        children_map.setdefault(edge["source"], []).append(edge["target"])

    return {
        "workflow": workflow,
        "subscriber": subscriber,
        # JSON-safe snapshot (UUID/datetime → str) threaded to channel tasks so
        # they skip re-fetching the subscriber. Computed once per execution.
        "subscriber_safe": json_safe(subscriber),
        "node_map": {n["id"]: n for n in nodes},
        "children_map": children_map,
    }


def _run_node_once(execution, ctx, node_id, node):
    """Dispatch a node exactly once, guarded by the ledger.

    Returns the node result ("ok"/"paused"/"skipped") on first dispatch, the prior
    recorded result on redelivery, or None if the node is concurrently in-flight
    (claimed but not yet resolved) — in which case the caller must not follow its
    children, to avoid racing a parallel run.
    """
    exec_id = execution["id"]
    claimed = execute_insert_query(Q_CLAIM_STEP, [uuid.uuid4(), exec_id, node_id])
    if claimed is None:
        prior = execute_read_one_query(Q_GET_STEP_STATUS, [exec_id, node_id])
        status = prior["status"] if prior else "running"
        return None if status == "running" else status

    from alrt_workers.tasks.step_runner import execute_step

    subscriber = ctx["subscriber"]
    result = execute_step(
        str(exec_id),
        node,
        str(subscriber["id"]),
        str(execution["team_id"]),
        execution["event_payload"] or {},
        subscriber["channel_preferences"] or {},
        allowed_channels=execution["channels"],
        overrides=execution.get("overrides") or {},
        workflow_category=ctx["workflow"].get("category"),
        subscriber=ctx["subscriber_safe"],
    )
    execute_update_query(Q_SET_STEP_STATUS, [exec_id, node_id, result])
    return result


def _walk(execution, ctx, start_ids, log):
    """BFS the definition from start_ids, dispatching each node once via the ledger.

    Returns True if any branch paused (delay/DND), meaning the execution is not yet
    complete and will be resumed by the poller.
    """
    node_map = ctx["node_map"]
    children_map = ctx["children_map"]

    queue = list(start_ids)
    visited = set()
    paused = False

    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        node = node_map.get(current_id)
        if not node:
            continue

        log.info("node %s (%s)", current_id, node.get("type"))
        result = _run_node_once(execution, ctx, current_id, node)

        if result is None:
            continue  # in-flight in a concurrent run — don't follow children
        if result == "paused":
            paused = True
            continue  # resumed later by the poller
        if result == "skipped":
            continue  # condition failed / filtered — don't follow children

        queue.extend(children_map.get(current_id, []))

    return paused


def maybe_complete(execution_id):
    """Mark the execution completed once no work remains open.

    "Open" means either a pending/processing scheduled step, or a 'running' ledger
    row — a node claimed but never resolved because the worker crashed mid-dispatch.
    Holding the execution open on a stuck ledger row is what stops a dropped branch
    from being silently completed; the reconciler reaps and re-drives it instead.

    Callers must mark the resuming scheduled step done *before* calling this, so a
    still-'processing' row for the current step doesn't hold the execution open.
    """
    if execute_read_one_query(Q_HAS_OPEN_STEPS, [execution_id]):
        return
    if execute_read_one_query(Q_HAS_OPEN_LEDGER, [execution_id]):
        return
    execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution_id, "completed"])


@celery_app.task(bind=True, max_retries=3)
def execute(self, execution_id):
    """Load a workflow execution and walk its node graph from the trigger.

    Args:
        execution_id: UUID string of the workflow_executions row to run.
    """
    execution = execute_read_one_query(Q_GET_EXECUTION, [uuid.UUID(execution_id)])
    if not execution:
        return

    ctx = _load_context(execution)
    if ctx is None:
        execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution["id"], "failed"])
        return

    trigger = next((n for n in ctx["node_map"].values() if n.get("type") == "trigger"), None)
    if not trigger:
        execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution["id"], "failed"])
        return

    _walk(execution, ctx, ctx["children_map"].get(trigger["id"], []), _bind_logger(execution))
    maybe_complete(execution["id"])


def resume_from(execution_id, node_id):
    """Continue a paused execution from a scheduled step (delay or DND reschedule).

    Reconstructs all context from the execution row, so nothing needs to be threaded
    through scheduled_steps. A delay node resumes from its children (the delay itself
    is done); a DND-deferred channel node re-runs itself (clear its ledger entry so it
    dispatches again — it will re-defer if still inside the DND window).
    """
    execution = execute_read_one_query(Q_GET_EXECUTION, [uuid.UUID(execution_id)])
    if not execution:
        return

    ctx = _load_context(execution)
    if ctx is None:
        execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution["id"], "failed"])
        return

    node = ctx["node_map"].get(node_id)
    if node is None:
        # Node no longer exists (workflow edited since the delay was scheduled);
        # nothing to resume. The poller finalizes the execution.
        return

    if node.get("type") == "delay":
        start_ids = ctx["children_map"].get(node_id, [])
    else:
        execute_update_query(Q_DELETE_STEP, [execution["id"], node_id])
        start_ids = [node_id]

    _walk(execution, ctx, start_ids, _bind_logger(execution))
