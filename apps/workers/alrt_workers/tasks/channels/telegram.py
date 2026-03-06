import json
import logging
import os
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.retry import TELEGRAM_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"

# Queries
Q_GET_SUBSCRIBER = (
    "SELECT id, team_id, external_id, email, name, slack_user_id, phone_number, "
    "discord_webhook_url, telegram_chat_id, custom_properties, channel_preferences "
    "FROM subscribers WHERE id = $1 AND is_deleted = false"
)
Q_GET_NOTIFICATION = (
    "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, "
    "payload, status, created_at FROM notifications WHERE id = $1"
)
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status)
    VALUES ($1, $2, $3, $4, 'telegram', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"

# HTTP status codes that indicate a permanent, non-retriable failure
# 400 = bad request (invalid chat_id or malformed message)
# 401 = unauthorized (invalid bot token)
# 403 = forbidden (bot blocked by user or group)
PERMANENT_HTTP_CODES = {400, 401, 403}


class _PermanentTelegramError(Exception):
    pass


class _TelegramRateLimited(Exception):
    """Raised by _send_telegram_message when API returns 429 Too Many Requests."""

    def __init__(self, retry_after: int):
        super().__init__(f"Rate limited, retry after {retry_after}s")
        self.retry_after = retry_after


@celery_app.task(bind=True, **TELEGRAM_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None, overrides=None):
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber:
        log.warning(f"Subscriber {subscriber_id} not found")
        return

    chat_id = subscriber.get("telegram_chat_id")
    if not chat_id:
        log.warning(f"Subscriber {subscriber_id} has no telegram_chat_id")
        return

    # Telegram uses a shared bot token from environment (no per-team credentials)
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        log.error(f"TELEGRAM_BOT_TOKEN not configured — cannot send Telegram message for team {team_id}")
        return

    overrides = overrides or {}

    # Resolve template_id → template content (fallback to inline)
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    # Render message body via {{variable}} interpolation
    text = render(template_data.get("body", template_data.get("text", "")), payload, subscriber)

    # Use legacy Markdown parse mode — MarkdownV2 requires escaping many chars; legacy is forgiving
    parse_mode = template_data.get("parse_mode", "Markdown")

    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            None,  # Telegram has no separate subject/title concept
            text,
            payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        _send_telegram_message(bot_token, chat_id, text, parse_mode)
        execute_update_query(Q_MARK_SENT, [nid])
        # Increment monthly quota counter (soft limit — fire-and-forget, never blocks delivery)
        execute_update_query(
            """
            INSERT INTO team_quotas (team_id, period_start, monthly_count, over_limit)
            VALUES ($1, date_trunc('month', now()), 1, (1 > $2))
            ON CONFLICT (team_id, period_start) DO UPDATE
            SET monthly_count = team_quotas.monthly_count + 1,
                over_limit    = (team_quotas.monthly_count + 1) > $2,
                updated_at    = now()
            """,
            [uuid.UUID(team_id), int(os.getenv("MONTHLY_QUOTA_LIMIT", "1000"))],
        )
    except _PermanentTelegramError as exc:
        log.error(f"Permanent Telegram error for notification {nid}: {exc}")
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])
    except _TelegramRateLimited as exc:
        log.warning(f"Telegram rate limited for notification {nid}, retrying in {exc.retry_after}s")
        if nid and self.request.retries >= self.max_retries:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries + 1])
            raise
        raise self.retry(exc=exc, countdown=exc.retry_after, kwargs={
            "execution_id": execution_id,
            "subscriber_id": subscriber_id,
            "team_id": team_id,
            "template_data": template_data,
            "payload": payload,
            "notification_id": str(nid) if nid else None,
        })
    except Exception as exc:
        log.error(f"Telegram delivery failed for notification {nid}: {exc}")
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


def _send_telegram_message(token, chat_id, text, parse_mode="Markdown"):
    """Send a message via the Telegram Bot API sendMessage endpoint.

    Raises:
        _TelegramRateLimited: If API returns 429 with retry_after parameter.
        _PermanentTelegramError: If API returns a permanent error (400/401/403).
        httpx.HTTPStatusError: For other HTTP errors.
        RuntimeError: If the API returns ok=false with an error description.
    """
    resp = httpx.post(
        TELEGRAM_API_URL.format(token=token),
        json={
            "chat_id": chat_id,
            "text": text[:4096],  # Telegram hard limit: 4096 chars per message
            "parse_mode": parse_mode,
        },
        timeout=10,
    )

    if resp.status_code == 429:
        # Telegram rate limit: extract retry_after from response body
        retry_after = resp.json().get("parameters", {}).get("retry_after", 5)
        raise _TelegramRateLimited(int(retry_after))

    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentTelegramError(f"HTTP {resp.status_code}: {resp.text[:200]}")

    resp.raise_for_status()

    # Check application-level success (Telegram returns 200 with ok=false on logical errors)
    data = resp.json()
    if not data.get("ok"):
        description = data.get("description", "Unknown Telegram API error")
        raise RuntimeError(f"Telegram API error: {description}")
