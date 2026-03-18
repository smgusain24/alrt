import uuid
import json
import re
from datetime import datetime, timedelta, timezone
import os
import redis

from alrt_workers.db import execute_insert_query

# Queries
Q_CREATE_SCHEDULED_STEP = """
    INSERT INTO scheduled_steps (id, workflow_execution_id, next_step_id, payload, scheduled_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
"""


def execute_step(execution_id, node, subscriber_id, team_id, payload, preferences, allowed_channels=None, overrides=None, workflow_category=None):
    node_type = node.get("type")

    if node_type == "channel":
        return _handle_channel(execution_id, node, subscriber_id, team_id, payload, preferences, allowed_channels, overrides, workflow_category)
    elif node_type == "delay":
        return _handle_delay(execution_id, node, payload, subscriber_id, team_id)
    elif node_type == "condition":
        return _handle_condition(node, payload)

    return "ok"


def _handle_channel(execution_id, node, subscriber_id, team_id, payload, preferences, allowed_channels=None, overrides=None, workflow_category=None):
    channel = node.get("data", {}).get("channel", "in_app")
    CHANNEL_ALIASES = {"inapp": "in_app", "in-app": "in_app", "wa": "whatsapp"}
    channel = CHANNEL_ALIASES.get(channel, channel)

    if allowed_channels is not None and channel not in allowed_channels:
        return "skipped"

    pref_channel = "push" if channel.startswith("push_") else channel

    # 1. Global preferences
    if not preferences.get("global", {}).get(pref_channel, True):
        return "skipped"

    # 2. Category preferences
    if workflow_category and workflow_category in preferences.get("categories", {}):
        if not preferences["categories"][workflow_category].get(pref_channel, True):
            return "skipped"

    # 3. DND (Do Not Disturb)
    dnd = preferences.get("dnd")
    if dnd:
        tz_str = dnd.get("timezone", "UTC")
        if tz_str.startswith("UTC+") or tz_str.startswith("UTC-"):
            sign = 1 if tz_str[3] == "+" else -1
            offset_str = tz_str[4:]
            try:
                if ":" in offset_str:
                    h, m = map(int, offset_str.split(":"))
                elif "." in offset_str:
                    h, m = map(int, offset_str.split("."))
                else:
                    h, m = int(offset_str), 0
                tz = timezone(timedelta(hours=h * sign, minutes=m * sign))
            except ValueError:
                tz = timezone.utc
        else:
            tz = timezone.utc
            
        now = datetime.now(tz)
        current_time = now.strftime("%H:%M")
        start = dnd.get("start", "22:00")
        end = dnd.get("end", "08:00")
        
        in_dnd = False
        if start < end:
            in_dnd = start <= current_time < end
        else: # Crosses midnight
            in_dnd = current_time >= start or current_time < end
            
        if in_dnd:
            # Calculate next allowed time (end)
            end_h, end_m = map(int, end.split(":"))
            next_allowed = now.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
            if next_allowed <= now:
                next_allowed += timedelta(days=1)
            
            # Reschedule this exact channel step
            next_step_id = node.get("id")
            execute_insert_query(Q_CREATE_SCHEDULED_STEP, [
                uuid.uuid4(),
                uuid.UUID(execution_id),
                next_step_id,
                payload,
                next_allowed.astimezone(timezone.utc),
            ])
            return "paused"

    # 4. Frequency cap
    freq = preferences.get("frequency")
    if freq:
        max_daily = freq.get("max_per_day")
        if max_daily:
            r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
            key = f"freq:{team_id}:{subscriber_id}:{pref_channel}:day"
            count = r.incr(key)
            if count == 1:
                # Expire at midnight UTC (simplified)
                now_utc = datetime.now(timezone.utc)
                tomorrow = (now_utc + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                r.expireat(key, int(tomorrow.timestamp()))
            if count > max_daily:
                return "skipped"

    template_data = node.get("data", {}).get("template", {})

    if channel == "in_app":
        from alrt_workers.tasks.channels.inapp import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("in_app") if overrides else None)
    elif channel == "email":
        from alrt_workers.tasks.channels.email import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("email") if overrides else None)
    elif channel == "slack":
        from alrt_workers.tasks.channels.slack import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("slack") if overrides else None)
    elif channel == "whatsapp":
        from alrt_workers.tasks.channels.whatsapp import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("whatsapp") if overrides else None)
    elif channel == "discord":
        from alrt_workers.tasks.channels.discord import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("discord") if overrides else None)
    elif channel == "telegram":
        from alrt_workers.tasks.channels.telegram import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("telegram") if overrides else None)
    elif channel == "sms":
        from alrt_workers.tasks.channels.sms import deliver
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload, overrides=overrides.get("sms") if overrides else None)
    elif channel in ("push_android", "push_ios", "push_web", "push"):
        from alrt_workers.tasks.channels.push import deliver
        platform_map = {"push_android": "android", "push_ios": "ios", "push_web": "web", "push": None}
        deliver.delay(execution_id, subscriber_id, team_id, template_data, payload,
                      overrides=overrides.get("push") if overrides else None,
                      platform=platform_map.get(channel))

    return "ok"


def _handle_delay(execution_id, node, payload, subscriber_id=None, team_id=None):
    duration = node.get("data", {}).get("duration_seconds", 60)
    next_step_id = node.get("id")

    stored_payload = {
        **(payload or {}),
        "__subscriber_id": str(subscriber_id) if subscriber_id else None,
        "__team_id": str(team_id) if team_id else None,
    }

    execute_insert_query(Q_CREATE_SCHEDULED_STEP, [
        uuid.uuid4(),
        uuid.UUID(execution_id),
        next_step_id,
        stored_payload,
        datetime.now(timezone.utc) + timedelta(seconds=duration),
    ])

    return "paused"


# Condition operator registry (COND-01: numeric, COND-02: string)
def _op_equals(actual, expected):
    return actual == expected

def _op_not_equals(actual, expected):
    return actual != expected

def _op_exists(actual, _expected):
    return actual is not None

def _op_greater_than(actual, expected):
    return float(actual) > float(expected)

def _op_less_than(actual, expected):
    return float(actual) < float(expected)

def _op_between(actual, expected):
    """expected must be a 2-element list [min, max]."""
    if not isinstance(expected, list) or len(expected) != 2:
        return False
    return float(expected[0]) <= float(actual) <= float(expected[1])

def _op_contains(actual, expected):
    return str(expected) in str(actual)

def _op_starts_with(actual, expected):
    return str(actual).startswith(str(expected))

def _op_regex(actual, expected):
    return bool(re.search(str(expected), str(actual)))

CONDITION_OPERATORS = {
    "equals": _op_equals,
    "not_equals": _op_not_equals,
    "exists": _op_exists,
    "greater_than": _op_greater_than,
    "less_than": _op_less_than,
    "between": _op_between,
    "contains": _op_contains,
    "starts_with": _op_starts_with,
    "regex": _op_regex,
}


def _handle_condition(node, payload):
    data = node.get("data", {})
    field = data.get("field", "")
    operator = data.get("operator", "equals")
    value = data.get("value")

    actual = payload.get(field)

    op_fn = CONDITION_OPERATORS.get(operator)
    if op_fn is None:
        return "ok"

    try:
        result = op_fn(actual, value)
    except (TypeError, ValueError, re.error):
        return "skipped"

    return "ok" if result else "skipped"
