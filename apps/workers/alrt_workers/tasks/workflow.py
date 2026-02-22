import uuid
import logging

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_update_query

logger = logging.getLogger("alrt.workers.workflow")

# Queries
Q_GET_EXECUTION = "SELECT id, team_id, workflow_id, subscriber_id, event_payload, channels, status FROM workflow_executions WHERE id = $1"
Q_GET_WORKFLOW = "SELECT id, team_id, name, event_name, definition, status FROM workflows WHERE id = $1"
Q_GET_SUBSCRIBER = "SELECT id, team_id, external_id, email, name, slack_user_id, custom_properties, channel_preferences FROM subscribers WHERE id = $1 AND is_deleted = false"
Q_UPDATE_EXECUTION_STATUS = "UPDATE workflow_executions SET status = $2, updated_at = now() WHERE id = $1"


@celery_app.task(bind=True, max_retries=3)
def execute(self, execution_id):
    execution = execute_read_one_query(Q_GET_EXECUTION, [uuid.UUID(execution_id)])
    if not execution:
        return

    workflow = execute_read_one_query(Q_GET_WORKFLOW, [execution["workflow_id"]])
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [execution["subscriber_id"]])

    if not workflow or not subscriber:
        execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution["id"], "failed"])
        return

    definition = workflow["definition"] or {}
    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])

    # Build adjacency: source -> [target1, target2, ...] (supports branching)
    children_map: dict[str, list[str]] = {}
    for edge in edges:
        src = edge["source"]
        if src not in children_map:
            children_map[src] = []
        children_map[src].append(edge["target"])

    # Find trigger node
    trigger = next(
        (n for n in nodes if n.get("type") == "trigger"),
        None,
    )
    if not trigger:
        execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution["id"], "failed"])
        return

    node_map = {n["id"]: n for n in nodes}
    allowed_channels = execution["channels"]

    from alrt_workers.tasks.step_runner import execute_step

    # BFS walk — supports branching (one node can have multiple children)
    queue = list(children_map.get(trigger["id"], []))
    visited = set()
    paused = False

    while queue:
        current_id = queue.pop(0)

        # Avoid revisiting nodes (handles diamond patterns)
        if current_id in visited:
            continue
        visited.add(current_id)

        node = node_map.get(current_id)
        if not node:
            continue

        logger.info(f"Executing node: {node['type']} ({current_id})")

        result = execute_step(
            str(execution["id"]),
            node,
            str(subscriber["id"]),
            str(execution["team_id"]),
            execution["event_payload"] or {},
            subscriber["channel_preferences"] or {},
            allowed_channels=allowed_channels,
        )

        if result == "paused":
            paused = True
            continue  # Don't follow children of paused nodes, but process other branches

        if result == "skipped":
            continue  # Don't follow children of skipped condition nodes

        # Add children to the queue
        children = children_map.get(current_id, [])
        queue.extend(children)

    if not paused:
        execute_update_query(Q_UPDATE_EXECUTION_STATUS, [execution["id"], "completed"])
