import json
import logging

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.utils.template import render
from alrt_db.session import sync_session
from alrt_db.models.notification import Notification
from alrt_db.models.provider import Provider
from alrt_db.models.subscriber import Subscriber

log = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=5,
    default_retry_delay=30,
    retry_backoff=True,
    retry_backoff_max=3600,
)
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload):
    with sync_session() as db:
        subscriber = db.get(Subscriber, subscriber_id)
        if not subscriber or not subscriber.email:
            log.warning(f"Subscriber {subscriber_id} has no email")
            return

        # Load email provider for this team
        from sqlalchemy import select
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

        # Decrypt provider config
        from cryptography.fernet import Fernet
        import os
        f = Fernet(os.getenv("ENCRYPTION_KEY", "").encode())
        config = json.loads(f.decrypt(provider.config["encrypted"].encode()))

        subject = render(template_data.get("subject", ""), payload)
        body_html = render(template_data.get("body", ""), payload)

        # Create notification record
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
        except Exception as exc:
            notification.status = "failed"
            db.commit()
            raise self.retry(exc=exc)

        db.commit()


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
