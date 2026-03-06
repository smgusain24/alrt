import json
import logging
import os
import re
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.retry import WHATSAPP_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

WHATSAPP_API_URL = "https://graph.facebook.com/v21.0/{phone_number_id}/messages"

PERMANENT_HTTP_CODES = {400, 401, 403}

# Meta-specific error codes that indicate template/session issues (not permanent failures)
# 131026 = recipient not in 24h session window; 132000 = template required
TEMPLATE_REQUIRED_ERRORS = {131026, 132000}

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
    VALUES ($1, $2, $3, $4, 'whatsapp', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"
Q_STORE_WAMID = "UPDATE notifications SET payload = payload || $2::jsonb, updated_at = now() WHERE id = $1"
Q_MARK_PENDING_TEMPLATE = "UPDATE notifications SET status = 'pending', error_reason = $2, updated_at = now() WHERE id = $1"


class _PermanentWhatsAppError(Exception):
    pass


class _TemplateRequiredError(Exception):
    """Raised when Meta API rejects freeform message due to no active 24h session window."""
    pass


def _normalize_phone(phone: str) -> str:
    """Strip non-digit characters to produce E.164 format for Meta API (digits only)."""
    return re.sub(r"[^\d]", "", phone)


@celery_app.task(bind=True, **WHATSAPP_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None, overrides=None):
    # 1. Get subscriber — check for phone_number
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber:
        log.warning(f"Subscriber {subscriber_id} not found")
        return
    if not subscriber.get("phone_number"):
        log.warning(f"Subscriber {subscriber_id} has no phone_number — cannot send WhatsApp message")
        return

    # 2. Normalize phone to digits only (E.164 without '+' prefix)
    phone = _normalize_phone(subscriber["phone_number"])
    if not phone:
        log.warning(f"Subscriber {subscriber_id} phone_number normalizes to empty — skipping")
        return

    # 3. Get WhatsApp credentials from environment
    wa_token = os.getenv("WHATSAPP_TOKEN", "")
    wa_phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    if not wa_token or not wa_phone_id:
        log.error(
            f"WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured — "
            f"cannot send WhatsApp message for team {team_id}"
        )
        return

    overrides = overrides or {}

    # 4. Resolve template_id → template content (fallback to inline)
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    # 5. Render body via template engine
    body = render(template_data.get("body", template_data.get("text", "")), payload, subscriber)

    # 6. Create notification row (if not retry)
    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            (template_data.get("subject", template_data.get("title", "")) or "")[:500],
            body,
            payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        # 7. Determine message type and send
        if template_data.get("media_url"):
            # Media message: image/document/video by URL
            media_type = template_data.get("media_type", "image")
            caption = template_data.get("caption", body)
            wamid = _send_whatsapp_media(
                wa_token, wa_phone_id, phone,
                media_type=media_type,
                media_url=template_data["media_url"],
                caption=caption,
            )
        elif template_data.get("template_name"):
            # Pre-approved template message — works outside 24h session window
            template_name = template_data["template_name"]
            language = template_data.get("template_language", "en_US")
            # Build positional params from template_variables list + payload values
            template_variables = template_data.get("template_variables", [])
            params = [str(payload.get(var, "")) for var in template_variables]
            wamid = _send_whatsapp_template(
                wa_token, wa_phone_id, phone,
                template_name=template_name,
                language=language,
                params=params,
            )
        else:
            # Freeform text message — requires active 24h session window
            wamid = _send_whatsapp_text(wa_token, wa_phone_id, phone, body)

        # 8. On success: store wamid in notification payload, mark sent, quota increment
        if nid and wamid:
            execute_update_query(Q_STORE_WAMID, [nid, json.dumps({"wamid": wamid})])

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

    except _TemplateRequiredError as exc:
        # 9. No active session and no template_name — mark pending (business rule, not DLQ)
        log.warning(f"WhatsApp template required for notification {nid}: {exc}")
        if nid:
            execute_update_query(Q_MARK_PENDING_TEMPLATE, [nid, "Template required - no active session"])

    except _PermanentWhatsAppError as exc:
        # 10. Permanent error (400/401/403) → DLQ
        log.error(f"Permanent WhatsApp error for notification {nid}: {exc}")
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])

    except Exception as exc:
        # 11. Transient error → retry or DLQ on exhaustion
        log.error(f"WhatsApp delivery failed for notification {nid}: {exc}")
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


def _parse_meta_response(resp) -> str:
    """Parse Meta API response, raising typed errors for known failure modes."""
    resp.raise_for_status()
    data = resp.json()
    # Check for Meta-specific errors (HTTP 200 with error body)
    if "error" in data:
        error_code = data["error"].get("code", 0)
        if error_code in TEMPLATE_REQUIRED_ERRORS:
            raise _TemplateRequiredError(data["error"].get("message", ""))
        raise _PermanentWhatsAppError(
            f"Meta API error {error_code}: {data['error'].get('message', '')}"
        )
    return data["messages"][0]["id"]  # wamid


def _send_whatsapp_text(token: str, phone_number_id: str, to: str, body: str) -> str:
    """Send a freeform text message via Meta Cloud API. Requires active 24h session window."""
    resp = httpx.post(
        WHATSAPP_API_URL.format(phone_number_id=phone_number_id),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": body},
        },
        timeout=15,
    )
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentWhatsAppError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    return _parse_meta_response(resp)


def _send_whatsapp_template(
    token: str,
    phone_number_id: str,
    to: str,
    template_name: str,
    language: str,
    params: list,
) -> str:
    """Send a pre-approved template message via Meta Cloud API. Works outside 24h session window."""
    components = []
    if params:
        components.append({
            "type": "body",
            "parameters": [{"type": "text", "text": p} for p in params],
        })

    resp = httpx.post(
        WHATSAPP_API_URL.format(phone_number_id=phone_number_id),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
                "components": components,
            },
        },
        timeout=15,
    )
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentWhatsAppError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    return _parse_meta_response(resp)


def _send_whatsapp_media(
    token: str,
    phone_number_id: str,
    to: str,
    media_type: str,
    media_url: str,
    caption: str = "",
) -> str:
    """Send a media message (image/document/video by URL) via Meta Cloud API."""
    if media_type not in ("image", "document", "video"):
        log.warning(f"Unsupported media_type '{media_type}' — falling back to 'image'")
        media_type = "image"

    media_payload = {"link": media_url}
    if caption:
        media_payload["caption"] = caption

    resp = httpx.post(
        WHATSAPP_API_URL.format(phone_number_id=phone_number_id),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": media_type,
            media_type: media_payload,
        },
        timeout=15,
    )
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentWhatsAppError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    return _parse_meta_response(resp)
