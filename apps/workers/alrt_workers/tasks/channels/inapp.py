import json
import logging
import os

import redis

from alrt_workers.celery_app import celery_app
from alrt_workers.utils.retry import INAPP_RETRY
from alrt_workers.utils.template import render
from alrt_db.session import sync_session
from alrt_db.models.notification import Notification

log = logging.getLogger(__name__)


@celery_app.task(bind=True, **INAPP_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None):
    title = render(template_data.get("title", ""), payload)
    body = render(template_data.get("body", ""), payload)
    action_url = template_data.get("action_url", "")

    with sync_session() as db:
        if notification_id:
            notification = db.get(Notification, notification_id)
        else:
            notification = Notification(
                team_id=team_id,
                subscriber_id=subscriber_id,
                workflow_execution_id=execution_id,
                channel="in_app",
                title=title,
                body=body,
                action_url=action_url,
                payload=payload,
                status="pending",
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)

        try:
            r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
            r.publish(
                f"subscriber:{subscriber_id}",
                json.dumps({
                    "type": "notification",
                    "data": {
                        "id": str(notification.id),
                        "title": title,
                        "body": body,
                        "action_url": action_url,
                        "read": False,
                        "created_at": notification.created_at.isoformat(),
                    },
                }),
            )
            notification.status = "sent"
            db.commit()
        except Exception as exc:
            log.error(f"In-app delivery failed for notification {notification.id}: {exc}")
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
