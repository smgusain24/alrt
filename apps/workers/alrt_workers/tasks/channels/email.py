import json
import logging
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
Q_UPDATE_NOTIFICATION_STATUS = "UPDATE notifications SET status = $2, updated_at = now() WHERE id = $1"


@celery_app.task(bind=True, **EMAIL_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None):
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber or not subscriber.get("email"):
        log.warning(f"Subscriber {subscriber_id} has no email")
        return

    provider = execute_read_one_query(Q_GET_EMAIL_PROVIDER, [uuid.UUID(team_id)])
    if not provider:
        log.warning(f"No email provider configured for team {team_id}")
        return

    f = get_fernet()
    config = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))

    subject = render(template_data.get("subject", ""), payload)
    body_html = render(template_data.get("body", ""), payload)

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
        _send_email(provider["provider_type"], config, subscriber["email"], subject, body_html)
        execute_update_query(Q_UPDATE_NOTIFICATION_STATUS, [nid, "sent"])
    except Exception as exc:
        log.error(f"Email delivery failed for notification {nid}: {exc}")
        if nid and self.request.retries >= self.max_retries:
            execute_update_query(Q_UPDATE_NOTIFICATION_STATUS, [nid, "failed"])
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


def _send_email(provider_type, config, to_email, subject, body_html):
    if provider_type == "sendgrid":
        httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {config['api_key']}"},
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": config.get("from_email", "noreply@alrt.dev")},
                "subject": subject,
                "content": [{"type": "text/html", "value": body_html}],
            },
        ).raise_for_status()

    elif provider_type == "resend":
        httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {config['api_key']}"},
            json={
                "from": config.get("from_email", "noreply@alrt.dev"),
                "to": [to_email],
                "subject": subject,
                "html": body_html,
            },
        ).raise_for_status()
