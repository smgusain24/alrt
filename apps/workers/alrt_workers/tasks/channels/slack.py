import json
import logging

import httpx
from sqlalchemy import select

from alrt_workers.celery_app import celery_app
from alrt_workers.utils.crypto import get_fernet
from alrt_workers.utils.retry import SLACK_RETRY
from alrt_workers.utils.template import render
from alrt_db.session import sync_session
from alrt_db.models.notification import Notification
from alrt_db.models.provider import Provider
from alrt_db.models.subscriber import Subscriber

log = logging.getLogger(__name__)

SLACK_API_URL = "https://slack.com/api/chat.postMessage"

NON_RETRIABLE_ERRORS = {
    "invalid_auth",
    "token_revoked",
    "account_inactive",
    "channel_not_found",
    "not_in_channel",
}


@celery_app.task(bind=True, **SLACK_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None):
    with sync_session() as db:
        subscriber = db.get(Subscriber, subscriber_id)
        if not subscriber:
            log.warning(f"Subscriber {subscriber_id} not found")
            return

        target = template_data.get("slack_channel_id") or subscriber.slack_user_id
        if not target:
            log.warning(f"Subscriber {subscriber_id} has no slack_user_id and no slack_channel_id in template")
            return

        result = db.execute(
            select(Provider).where(
                Provider.team_id == team_id,
                Provider.channel == "slack",
                Provider.is_active == True,
            )
        )
        provider = result.scalar_one_or_none()
        if not provider:
            log.warning(f"No Slack provider configured for team {team_id}")
            return

        f = get_fernet()
        config = json.loads(f.decrypt(provider.config["encrypted"].encode()))
        bot_token = config["bot_token"]

        text, blocks = _build_message(template_data, payload)

        if notification_id:
            notification = db.get(Notification, notification_id)
        else:
            notification = Notification(
                team_id=team_id,
                subscriber_id=subscriber_id,
                workflow_execution_id=execution_id,
                channel="slack",
                title=(template_data.get("title", "") or "")[:500],
                body=json.dumps(blocks) if blocks else text,
                payload=payload,
                status="pending",
            )
            db.add(notification)
            db.commit()
            db.refresh(notification)

        try:
            _send_slack_message(bot_token, target, text, blocks)
            notification.status = "sent"
            db.commit()
        except _PermanentSlackError as exc:
            nid = getattr(notification, "id", None)
            log.error(f"Permanent Slack error for notification {nid}: {exc}")
            if nid:
                notification.status = "failed"
                db.commit()
        except Exception as exc:
            nid = getattr(notification, "id", None)
            log.error(f"Slack delivery failed for notification {nid}: {exc}")
            if nid and self.request.retries >= self.max_retries:
                notification.status = "failed"
                db.commit()
                raise
            if nid:
                db.commit()
                raise self.retry(exc=exc, kwargs={
                    "execution_id": execution_id,
                    "subscriber_id": subscriber_id,
                    "team_id": team_id,
                    "template_data": template_data,
                    "payload": payload,
                    "notification_id": str(nid),
                })
            raise


class _PermanentSlackError(Exception):
    pass


def _build_message(template_data, payload):
    """Build Slack message text and optional Block Kit blocks."""
    blocks = None

    if "blocks" in template_data:
        blocks_raw = json.dumps(template_data["blocks"])
        blocks_rendered = render(blocks_raw, payload)
        blocks = json.loads(blocks_rendered)
        text = render(template_data.get("text", template_data.get("title", "Notification")), payload)
    else:
        title = render(template_data.get("title", ""), payload)
        body = render(template_data.get("body", template_data.get("text", "")), payload)
        text = f"*{title}*\n{body}" if title else body

    return text, blocks


def _send_slack_message(bot_token, channel, text, blocks=None):
    """Send message via Slack chat.postMessage API."""
    message_payload = {
        "channel": channel,
        "text": text,
    }
    if blocks:
        message_payload["blocks"] = blocks

    resp = httpx.post(
        SLACK_API_URL,
        headers={"Authorization": f"Bearer {bot_token}"},
        json=message_payload,
        timeout=10,
    )
    resp.raise_for_status()

    data = resp.json()
    if not data.get("ok"):
        error_code = data.get("error", "unknown")
        if error_code in NON_RETRIABLE_ERRORS:
            raise _PermanentSlackError(error_code)
        raise RuntimeError(f"Slack API error: {error_code}")
