"""Discord channel delivery task using webhook URLs with optional rich embeds."""

import json
import logging
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.providers_cache import get_provider
from alrt_workers.utils.crypto import get_fernet
from alrt_workers.utils.retry import DISCORD_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

# Queries
Q_GET_SUBSCRIBER = (
    "SELECT id, team_id, external_id, email, name, slack_user_id, phone_number, "
    "discord_webhook_url, telegram_chat_id, custom_properties, channel_preferences "
    "FROM subscribers WHERE id = $1 AND is_deleted = false"
)
Q_GET_DISCORD_PROVIDER = (
    "SELECT id, team_id, channel, provider_type, config, is_active "
    "FROM providers WHERE team_id = $1 AND channel = 'discord' AND is_active = true LIMIT 1"
)
Q_GET_NOTIFICATION = (
    "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, "
    "payload, status, created_at FROM notifications WHERE id = $1"
)
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status)
    VALUES ($1, $2, $3, $4, 'discord', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"

# HTTP status codes that indicate a permanent failure (no point retrying)
# 404 = webhook URL deleted/invalid
PERMANENT_HTTP_CODES = {400, 401, 403, 404}


class _PermanentDiscordError(Exception):
    pass


@celery_app.task(bind=True, **DISCORD_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None, overrides=None, subscriber=None):
    subscriber = subscriber or execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber:
        log.warning("Subscriber %s not found", subscriber_id)
        return

    # Resolve webhook URL: subscriber-level first, then team provider fallback
    webhook_url = subscriber.get("discord_webhook_url")

    if not webhook_url:
        provider = get_provider(team_id, "discord", lambda: execute_read_one_query(Q_GET_DISCORD_PROVIDER, [uuid.UUID(team_id)]))
        if provider:
            f = get_fernet()
            config = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))
            webhook_url = config.get("webhook_url")

    if not webhook_url:
        log.warning("Subscriber %s has no discord_webhook_url and team %s has no Discord provider", subscriber_id, team_id)
        return

    overrides = overrides or {}

    # Resolve template_id → template content (fallback to inline)
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    # Render title and description via {{variable}} interpolation
    title = render(template_data.get("title", ""), payload, subscriber)
    description = render(template_data.get("body", template_data.get("text", "")), payload, subscriber)
    color_hex = template_data.get("color", "3b82f6")
    footer = template_data.get("footer", "")
    timestamp = template_data.get("timestamp")
    embed_enabled = template_data.get("embed_enabled", True)

    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            title[:500] if title else None,
            description,
            payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        _send_discord_message(webhook_url, title, description, color_hex, footer, timestamp, embed_enabled)
        execute_update_query(Q_MARK_SENT, [nid])
    except _PermanentDiscordError as exc:
        log.error("Permanent Discord error for notification %s: %s", nid, exc)
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])
    except Exception as exc:
        log.error("Discord delivery failed for notification %s: %s", nid, exc)
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


def _send_discord_message(webhook_url, title, description, color_hex, footer, timestamp, embed_enabled=True):
    """Send a message to a Discord webhook.

    Args:
        webhook_url: The Discord webhook URL.
        title: Embed title (max 256 chars).
        description: Embed description or plain-text content (max 4096/2000 chars).
        color_hex: Hex color string for the embed sidebar (e.g. "3b82f6").
        footer: Optional embed footer text.
        timestamp: Optional ISO 8601 timestamp for the embed.
        embed_enabled: If False, sends plain content text instead of a rich embed.

    Raises:
        _PermanentDiscordError: For non-retriable HTTP status codes.
        httpx.HTTPStatusError: For other HTTP errors.
    """
    if not embed_enabled:
        # Plain content fallback — useful when embed formatting is not desired
        resp = httpx.post(
            webhook_url,
            json={"content": description[:2000]},
            timeout=10,
        )
        if resp.status_code not in (200, 204):
            _check_response(resp)
        return

    # Convert hex color string to integer (Discord requires integer color values)
    # Default blue: 0x3b82f6 = 3899126
    try:
        color_int = int(color_hex.lstrip("#"), 16)
    except (ValueError, AttributeError):
        color_int = 0x3B82F6  # Fallback to default blue

    embed = {
        "title": title[:256] if title else None,
        "description": description[:4096] if description else None,
        "color": color_int,
    }

    # Remove None values from embed to keep payload clean
    embed = {k: v for k, v in embed.items() if v is not None}

    if footer:
        embed["footer"] = {"text": footer[:2048]}

    if timestamp:
        embed["timestamp"] = timestamp  # ISO 8601 format expected

    resp = httpx.post(
        webhook_url,
        json={"embeds": [embed]},
        timeout=10,
    )
    # Discord returns 204 No Content on success; 200 is also acceptable
    if resp.status_code not in (200, 204):
        _check_response(resp)


def _check_response(resp):
    """Raise permanent or retriable error based on HTTP status code."""
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentDiscordError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    resp.raise_for_status()
