import json
import logging
import os

import httpx
from cryptography.fernet import Fernet
from sqlalchemy import select

from alrt_workers.celery_app import celery_app
from alrt_workers.utils.retry import EMAIL_RETRY
from alrt_workers.utils.template import render
from alrt_db.session import sync_session
from alrt_db.models.notification import Notification
from alrt_db.models.provider import Provider
from alrt_db.models.subscriber import Subscriber

log = logging.getLogger(__name__)


@celery_app.task(bind=True, **EMAIL_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None):
    with sync_session() as db:
        subscriber = db.get(Subscriber, subscriber_id)
        if not subscriber or not subscriber.email:
            log.warning(f"Subscriber {subscriber_id} has no email")
            return

        result = db.execute(
            select(Provider).where(
                Provider.team_id == team_id,
                Provider.channel == "email",
                Provider.is_active == True,
            )
        )
        provider = result.scalar_one_or_none()
        if not provider:
            log.warning(f"No email provider configured for team {team_id}")
            return

        f = Fernet(os.getenv("ENCRYPTION_KEY", "").encode())
        config = json.loads(f.decrypt(provider.config["encrypted"].encode()))

        subject = render(template_data.get("subject", ""), payload)
        body_html = render(template_data.get("body", ""), payload)

        if notification_id:
            notification = db.get(Notification, notification_id)
        else:
            notification = Notification(
                team_id=team_id,
                subscriber_id=subscriber_id,
                workflow_execution_id=execution_id,
                channel="email",
                title=subject,
                body=body_html,
                payload=payload,
                status="pending",
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)

        try:
            _send_email(provider.provider_type, config, subscriber.email, subject, body_html)
            notification.status = "sent"
            db.commit()
        except Exception as exc:
            log.error(f"Email delivery failed for notification {notification.id}: {exc}")
            if self.request.retries >= self.max_retries:
                notification.status = "failed"
                db.commit()
                raise
            db.commit()
            raise self.retry(exc=exc, kwargs={
                "execution_id": execution_id,
                "subscriber_id": subscriber_id,
                "team_id": team_id,
                "template_data": template_data,
                "payload": payload,
                "notification_id": str(notification.id),
            })


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
