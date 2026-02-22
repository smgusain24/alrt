import uuid
import json
from datetime import datetime, timedelta, timezone

from alrt_workers.db import execute_insert_query

# Queries
Q_CREATE_SCHEDULED_STEP = """
    INSERT INTO scheduled_steps (id, workflow_execution_id, next_step_id, payload, scheduled_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
"""


def execute_step(execution_id, node, subscriber_id, team_id, payload, preferences, allowed_channels=None):
    node_type = node.get("type")

    if node_type == "channel":
        return _handle_channel(execution_id, node, subscriber_id, team_id, payload, preferences, allowed_channels)
    elif node_type == "delay":
        return _handle_delay(execution_id, node, payload)
    elif node_type == "condition":
        return _handle_condition(node, payload)

    return "ok"


def _handle_channel(execution_id, node, subscriber_id, team_id, payload, preferences, allowed_channels=None):
    channel = node.get("data", {}).get("channel", "in_app")

    # Normalize channel names (builder may save "inapp" instead of "in_app")
    CHANNEL_ALIASES = {"inapp": "in_app", "in-app": "in_app"}
    channel = CHANNEL_ALIASES.get(channel, channel)

    # Check API-level channel override (filter)
    if allowed_channels is not None and channel not in allowed_channels:
        return "skipped"

    # Check subscriber preferences
    workflow_prefs = preferences.get(node.get("data", {}).get("workflow_name", ""), {})
    if not workflow_prefs.get(channel, True):
        return "skipped"

    template_data = node.get("data", {}).get("template", {})

    if channel == "in_app":
        from alrt_workers.tasks.channels.inapp import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload)
    elif channel == "email":
        from alrt_workers.tasks.channels.email import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload)
    elif channel == "slack":
        from alrt_workers.tasks.channels.slack import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload)

    return "ok"


def _handle_delay(execution_id, node, payload):
    duration = node.get("data", {}).get("duration_seconds", 60)
    next_step_id = node.get("id")

    execute_insert_query(Q_CREATE_SCHEDULED_STEP, [
        uuid.uuid4(),
        uuid.UUID(execution_id),
        next_step_id,
        payload,
        datetime.now(timezone.utc) + timedelta(seconds=duration),
    ])

    return "paused"


def _handle_condition(node, payload):
    data = node.get("data", {})
    field = data.get("field", "")
    operator = data.get("operator", "equals")
    value = data.get("value")

    actual = payload.get(field)

    if operator == "equals":
        return "ok" if actual == value else "skipped"
    elif operator == "not_equals":
        return "ok" if actual != value else "skipped"
    elif operator == "exists":
        return "ok" if actual is not None else "skipped"

    return "ok"
