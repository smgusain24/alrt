import redis

from alrt_workers.celery_app import celery_app
from alrt_workers.utils.template import render
from alrt_db.session import sync_session
from alrt_db.models.notification import Notification


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload):
    title = render(template_data.get("title", ""), payload)
    body = render(template_data.get("body", ""), payload)
    action_url = template_data.get("action_url", "")

    with sync_session() as db:
        notification = Notification(
            team_id=team_id,
            subscriber_id=subscriber_id,
            workflow_execution_id=execution_id,
            channel="in_app",
            title=title,
            body=body,
            action_url=action_url,
            payload=payload,
            status="sent",
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Publish to Redis for WebSocket fanout
        import json
        import os
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
