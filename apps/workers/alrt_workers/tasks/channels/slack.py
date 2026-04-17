"""Slack channel delivery task using the chat.postMessage API."""

import json
import logging
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.crypto import get_fernet
from alrt_workers.utils.retry import SLACK_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

SLACK_API_URL = "https://slack.com/api/chat.postMessage"

NON_RETRIABLE_ERRORS = {
    "invalid_auth",
    "token_revoked",
    "account_inactive",
    "channel_not_found",
    "not_in_channel",
}

# Queries
Q_GET_SUBSCRIBER = "SELECT id, team_id, external_id, email, name, slack_user_id, custom_properties, channel_preferences FROM subscribers WHERE id = $1 AND is_deleted = false"
Q_GET_SLACK_PROVIDER = "SELECT id, team_id, channel, provider_type, config, is_active FROM providers WHERE team_id = $1 AND channel = 'slack' AND is_active = true LIMIT 1"
Q_GET_NOTIFICATION = "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status, created_at FROM notifications WHERE id = $1"
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status)
    VALUES ($1, $2, $3, $4, 'slack', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"


@celery_app.task(bind=True, **SLACK_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None, overrides=None):
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber:
        log.warning("Subscriber %s not found", subscriber_id)
        return

    overrides = overrides or {}
    target = overrides.get("channel_id") or template_data.get("slack_channel_id") or subscriber.get("slack_user_id")
    if not target:
        log.warning("Subscriber %s has no slack_user_id and no slack_channel_id in template", subscriber_id)
        return

    provider = execute_read_one_query(Q_GET_SLACK_PROVIDER, [uuid.UUID(team_id)])
    if not provider:
        log.warning("No Slack provider configured for team %s", team_id)
        return

    # Decrypt provider credentials
    f = get_fernet()
    config = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))
    bot_token = config.get("bot_token")
    if not bot_token:
        log.warning("Slack provider for team %s has no bot_token", team_id)
        return

    # Resolve template_id → template content (fallback to inline)
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    text, blocks = _build_message(template_data, payload, subscriber)

    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            (template_data.get("title", "") or "")[:500],
            json.dumps(blocks) if blocks else text,
            payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        _send_slack_message(bot_token, target, text, blocks, thread_ts=overrides.get("thread_ts"))
        execute_update_query(Q_MARK_SENT, [nid])
    except _PermanentSlackError as exc:
        log.error("Permanent Slack error for notification %s: %s", nid, exc)
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])
    except Exception as exc:
        log.error("Slack delivery failed for notification %s: %s", nid, exc)
        if nid and self.request.retries >= self.max_retries:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries + 1])
            raise
        if nid:
            raise self.retry(exc=exc, kwargs={
                "execution_id": execution_id,
                "subscriber_id": subscriber_id,
                "team_id": team_id,
                "template_data": template_data,
                "payload": payload,
                "notification_id": str(nid),
            })
        raise


class _PermanentSlackError(Exception):
    pass


def _build_message(template_data, payload, subscriber=None):
    """Build Slack message text and optional Block Kit blocks."""
    blocks = None

    if "blocks" in template_data:
        blocks_raw = json.dumps(template_data["blocks"])
        blocks_rendered = render(blocks_raw, payload, subscriber)
        blocks = json.loads(blocks_rendered)
        text = render(template_data.get("text", template_data.get("title", "Notification")), payload, subscriber)
    else:
        title = render(template_data.get("title", ""), payload, subscriber)
        body = render(template_data.get("body", template_data.get("text", "")), payload, subscriber)
        text = f"*{title}*\n{body}" if title else body

    return text, blocks


def _send_slack_message(bot_token, channel, text, blocks=None, thread_ts=None):
    """Send a message via the Slack chat.postMessage API.

    Args:
        bot_token: OAuth bot token for the team's Slack workspace.
        channel: Slack channel ID or user ID to post to.
        text: Plain-text fallback content (shown in notifications).
        blocks: Optional Block Kit block list for rich formatting.
        thread_ts: Optional thread timestamp for threaded replies.

    Raises:
        _PermanentSlackError: For non-retriable Slack API errors.
        RuntimeError: For other Slack API errors.
    """
    message_payload = {
        "channel": channel,
        "text": text,
    }
    if blocks:
        message_payload["blocks"] = blocks
    if thread_ts:
        message_payload["thread_ts"] = thread_ts

    resp = httpx.post(
        SLACK_API_URL,
        headers={"Authorization": f"Bearer {bot_token}"},
        json=message_payload,
        timeout=10,
    )
    resp.raise_for_status()

    data = resp.json()
    if not data.get("ok"):
        error_code = data.get("error", "unknown")
        if error_code in NON_RETRIABLE_ERRORS:
            raise _PermanentSlackError(error_code)
        raise RuntimeError(f"Slack API error: {error_code}")
