import json
import logging
import os
import uuid

import redis

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.retry import INAPP_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

# Queries
Q_GET_NOTIFICATION = "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, action_url, payload, status, created_at FROM notifications WHERE id = $1"
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, action_url, payload, status)
    VALUES ($1, $2, $3, $4, 'in_app', $5, $6, $7, $8, 'pending')
    RETURNING id, created_at
"""
Q_UPDATE_NOTIFICATION_STATUS = "UPDATE notifications SET status = $2, updated_at = now() WHERE id = $1"


@celery_app.task(bind=True, **INAPP_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None):
    title = render(template_data.get("title", ""), payload)
    body = render(template_data.get("body", ""), payload)
    action_url = template_data.get("action_url", "")

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
            body,
            action_url,
            payload,
        ])
        # Merge the generated id into the notification dict
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
        r.publish(
            f"subscriber:{subscriber_id}",
            json.dumps({
                "type": "notification",
                "data": {
                    "id": str(nid),
                    "title": title,
                    "body": body,
                    "action_url": action_url,
                    "read": False,
                    "created_at": notification["created_at"].isoformat() if notification and "created_at" in notification else None,
                },
            }),
        )
        execute_update_query(Q_UPDATE_NOTIFICATION_STATUS, [nid, "sent"])
    except Exception as exc:
        log.error(f"In-app delivery failed for notification {nid}: {exc}")
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
