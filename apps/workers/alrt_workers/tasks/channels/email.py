import json
import logging
import os
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.crypto import get_fernet
from alrt_workers.utils.retry import EMAIL_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

# Queries
Q_GET_SUBSCRIBER = "SELECT id, team_id, external_id, email, name, slack_user_id, custom_properties, channel_preferences FROM subscribers WHERE id = $1 AND is_deleted = false"
Q_GET_EMAIL_PROVIDER = "SELECT id, team_id, channel, provider_type, config, is_active FROM providers WHERE team_id = $1 AND channel = 'email' AND is_active = true LIMIT 1"
Q_GET_NOTIFICATION = "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status, created_at FROM notifications WHERE id = $1"
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status)
    VALUES ($1, $2, $3, $4, 'email', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"

PERMANENT_HTTP_CODES = {400, 401, 403, 422}


class _PermanentEmailError(Exception):
    pass


@celery_app.task(bind=True, **EMAIL_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None, overrides=None):
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber or not subscriber.get("email"):
        log.warning(f"Subscriber {subscriber_id} has no email")
        return

    provider = execute_read_one_query(Q_GET_EMAIL_PROVIDER, [uuid.UUID(team_id)])
    if not provider:
        log.warning(f"No email provider configured for team {team_id}")
        return

    if provider["provider_type"] == "alrt_hosted":
        # alrt_hosted: config stores display_name only (no secrets, no encryption)
        config = provider["config"]  # plain dict: {"display_name": "Team Name"}
        config["api_key"] = os.getenv("RESEND_API_KEY", "")
        if not config["api_key"]:
            log.error(f"RESEND_API_KEY not configured — cannot send email for team {team_id}")
            return
    else:
        # BYOC path: decrypt per-team credentials (sendgrid / resend with encrypted config)
        f = get_fernet()
        config = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))

    overrides = overrides or {}

    # Resolve template_id → template content (fallback to inline)
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    subject = overrides.get("subject") or render(template_data.get("subject", ""), payload, subscriber)
    body_html = render(template_data.get("body", ""), payload, subscriber)
    to_email = overrides.get("to") or subscriber["email"]

    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            subject[:500] if subject else None,
            body_html,
            payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        _send_email(
            provider["provider_type"],
            config,
            to_email,
            subject,
            body_html,
            cc=overrides.get("cc", []),
            bcc=overrides.get("bcc", []),
            reply_to=overrides.get("reply_to"),
        )
        execute_update_query(Q_MARK_SENT, [nid])
        # Get plan-based quota limit (fire-and-forget — never blocks delivery)
        try:
            _limit_row = execute_read_one_query(
                """SELECT COALESCE(p.quota_limit, 1000) AS quota_limit
                   FROM teams t LEFT JOIN plans p ON t.plan_id = p.id
                   WHERE t.id = $1""",
                [uuid.UUID(team_id)],
            )
            _quota_limit = _limit_row["quota_limit"] if _limit_row else 1000
        except Exception:
            _quota_limit = 1000
        execute_update_query(
            """
            INSERT INTO team_quotas (team_id, period_start, monthly_count, over_limit)
            VALUES ($1, date_trunc('month', now()), 1, (1 > $2))
            ON CONFLICT (team_id, period_start) DO UPDATE
            SET monthly_count = team_quotas.monthly_count + 1,
                over_limit    = (team_quotas.monthly_count + 1) > $2,
                updated_at    = now()
            """,
            [uuid.UUID(team_id), _quota_limit],
        )
    except _PermanentEmailError as exc:
        log.error(f"Permanent email error for notification {nid}: {exc}")
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])
    except Exception as exc:
        log.error(f"Email delivery failed for notification {nid}: {exc}")
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


def _send_email(provider_type, config, to_email, subject, body_html, cc=None, bcc=None, reply_to=None):
    if provider_type == "alrt_hosted":
        # Use alrt's shared Resend account. api_key injected into config dict in deliver().
        display_name = config.get("display_name", "")
        # Sanitize display_name: strip angle brackets, limit to 64 chars
        display_name = display_name.replace("<", "").replace(">", "").strip()[:64]
        from_addr = f"{display_name} <noreply@alrt.dev>" if display_name else "noreply@alrt.dev"

        payload = {
            "from": from_addr,
            "to": [to_email],
            "subject": subject,
            "html": body_html,
        }
        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc
        if reply_to:
            payload["reply_to"] = reply_to

        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {config['api_key']}"},
            json=payload,
            timeout=15,
        )
        _check_response(resp)
        return

    elif provider_type == "sendgrid":
        personalization = {"to": [{"email": to_email}]}
        if cc:
            personalization["cc"] = [{"email": email} for email in cc]
        if bcc:
            personalization["bcc"] = [{"email": email} for email in bcc]

        payload = {
            "personalizations": [personalization],
            "from": {"email": config.get("from_email", "noreply@alrt.dev")},
            "subject": subject,
            "content": [{"type": "text/html", "value": body_html}],
        }
        if reply_to:
            payload["reply_to"] = {"email": reply_to}

        resp = httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {config['api_key']}"},
            json=payload,
        )
        _check_response(resp)

    elif provider_type == "resend":
        payload = {
            "from": config.get("from_email", "noreply@alrt.dev"),
            "to": [to_email],
            "subject": subject,
            "html": body_html,
        }
        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc
        if reply_to:
            payload["reply_to"] = reply_to

        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {config['api_key']}"},
            json=payload,
        )
        _check_response(resp)


def _check_response(resp):
    if resp.status_code in PERMANENT_HTTP_CODES:
        raise _PermanentEmailError(f"HTTP {resp.status_code}: {resp.text[:200]}")
    resp.raise_for_status()
