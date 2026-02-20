from datetime import datetime, timedelta, timezone

from alrt_db.session import sync_session
from alrt_db.models.scheduled_step import ScheduledStep


def execute_step(execution_id, node, subscriber_id, team_id, payload, preferences):
    node_type = node.get("type")

    if node_type == "channel":
        return _handle_channel(execution_id, node, subscriber_id, team_id, payload, preferences)
    elif node_type == "delay":
        return _handle_delay(execution_id, node, payload)
    elif node_type == "condition":
        return _handle_condition(node, payload)

    return "ok"


def _handle_channel(execution_id, node, subscriber_id, team_id, payload, preferences):
    channel = node.get("data", {}).get("channel", "in_app")

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

    with sync_session() as db:
        step = ScheduledStep(
            workflow_execution_id=execution_id,
            next_step_id=next_step_id,
            payload=payload,
            scheduled_at=datetime.now(timezone.utc) + timedelta(seconds=duration),
        )
        db.add(step)
        db.commit()

    return "paused"


def _handle_condition(node, payload):
    # Simple condition: check if payload field matches value
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
