"""SMS channel delivery task supporting Twilio and Kaleyra (DLT-compliant) providers."""

import json
import logging
import re
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.crypto import get_fernet
from alrt_workers.utils.retry import SMS_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

PERMANENT_HTTP_CODES = {400, 401, 403, 422}

# Queries
Q_GET_SUBSCRIBER = (
    "SELECT id, team_id, external_id, email, name, slack_user_id, phone_number, "
    "discord_webhook_url, telegram_chat_id, custom_properties, channel_preferences "
    "FROM subscribers WHERE id = $1 AND is_deleted = false"
)
Q_GET_SMS_PROVIDER = (
    "SELECT id, team_id, channel, provider_type, config, is_active "
    "FROM providers WHERE team_id = $1 AND channel = 'sms' AND is_active = true LIMIT 1"
)
Q_GET_NOTIFICATION = (
    "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, "
    "payload, status, created_at FROM notifications WHERE id = $1"
)
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status)
    VALUES ($1, $2, $3, $4, 'sms', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"


class _PermanentSMSError(Exception):
    pass


def _normalize_phone(phone: str) -> str:
    """Strip non-digit characters."""
    return re.sub(r"[^\d]", "", phone)


@celery_app.task(bind=True, **SMS_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None, overrides=None):
    # 1. Get subscriber — check for phone_number
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber:
        log.warning("Subscriber %s not found", subscriber_id)
        return
    if not subscriber.get("phone_number"):
        log.warning("Subscriber %s has no phone_number — cannot send SMS", subscriber_id)
        return

    # 2. Normalize phone
    phone = _normalize_phone(subscriber["phone_number"])
    if not phone:
        log.warning("Subscriber %s phone_number normalizes to empty — skipping", subscriber_id)
        return

    # 3. Get SMS provider (BYOC only — no alrt-hosted SMS)
    provider = execute_read_one_query(Q_GET_SMS_PROVIDER, [uuid.UUID(team_id)])
    if not provider:
        log.warning("No SMS provider configured for team %s", team_id)
        return

    f = get_fernet()
    config = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))
    provider_type = provider["provider_type"]

    overrides = overrides or {}

    # 4. Resolve template_id → template content
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    # 5. Render body via template engine
    body = render(template_data.get("body", template_data.get("text", "")), payload, subscriber)

    # 6. DLT validation for Kaleyra
    if provider_type == "kaleyra":
        if not template_data.get("dlt_entity_id") or not template_data.get("dlt_template_id"):
            log.error(
                "Kaleyra SMS requires dlt_entity_id and dlt_template_id — "
                "missing for team %s, subscriber %s",
                team_id, subscriber_id,
            )
            return

    # 7. Create notification row (if not retry)
    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            None,  # SMS has no title/subject
            body,
            payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        # 8. Send via provider
        if provider_type == "twilio":
            _send_twilio(config, phone, body)
        elif provider_type == "kaleyra":
            _send_kaleyra(config, phone, body, template_data)
        else:
            raise _PermanentSMSError(f"Unknown SMS provider type: {provider_type}")

        execute_update_query(Q_MARK_SENT, [nid])

    except _PermanentSMSError as exc:
        log.error("Permanent SMS error for notification %s: %s", nid, exc)
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])

    except Exception as exc:
        log.error("SMS delivery failed for notification %s: %s", nid, exc)
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


def _send_twilio(config: dict, to: str, body: str):
    """Send SMS via Twilio REST API."""
    account_sid = config["account_sid"]
    auth_token = config["auth_token"]
    from_number = config.get("from_number", "")

    resp = httpx.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        auth=(account_sid, auth_token),
        data={"From": from_number, "To": f"+{to}", "Body": body},
        timeout=15,
    )
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentSMSError(f"Twilio HTTP {resp.status_code}: {resp.text[:200]}")
    resp.raise_for_status()


def _send_kaleyra(config: dict, to: str, body: str, template_data: dict):
    """Send SMS via Kaleyra API (India/DLT-compliant)."""
    api_key = config["api_key"]
    sid = config["sid"]
    sender_id = config.get("sender_id", "")

    kaleyra_payload = {
        "to": to,
        "body": body,
        "sender": sender_id,
        "type": "TXN",
        "template_id": template_data.get("dlt_template_id", ""),
        "entity_id": template_data.get("dlt_entity_id", ""),
    }

    resp = httpx.post(
        f"https://api.kaleyra.io/v1/{sid}/messages",
        headers={"api-key": api_key, "Content-Type": "application/json"},
        json=kaleyra_payload,
        timeout=15,
    )
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentSMSError(f"Kaleyra HTTP {resp.status_code}: {resp.text[:200]}")
    resp.raise_for_status()
