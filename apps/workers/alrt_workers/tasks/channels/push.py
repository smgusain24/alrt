"""Push notification delivery task supporting FCM (Android/Web) and APNs (iOS)."""

import json
import logging
import time
import uuid

import httpx

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt_workers.utils.crypto import get_fernet
from alrt_workers.utils.retry import PUSH_RETRY
from alrt_workers.utils.template import render

log = logging.getLogger(__name__)

PERMANENT_HTTP_CODES = {400, 401, 403}

# FCM error codes that indicate invalid/expired tokens
FCM_INVALID_TOKEN_ERRORS = {"NotRegistered", "InvalidRegistration", "MismatchSenderId"}

# Queries
Q_GET_SUBSCRIBER = (
    "SELECT id, team_id, external_id, email, name, slack_user_id, phone_number, "
    "discord_webhook_url, telegram_chat_id, push_tokens, custom_properties, channel_preferences "
    "FROM subscribers WHERE id = $1 AND is_deleted = false"
)
Q_GET_PUSH_PROVIDER = (
    "SELECT id, team_id, channel, provider_type, config, is_active "
    "FROM providers WHERE team_id = $1 AND channel = 'push' AND is_active = true LIMIT 1"
)
Q_GET_NOTIFICATION = (
    "SELECT id, team_id, subscriber_id, workflow_execution_id, channel, title, body, "
    "payload, status, created_at FROM notifications WHERE id = $1"
)
Q_CREATE_NOTIFICATION = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, payload, status)
    VALUES ($1, $2, $3, $4, 'push', $5, $6, $7, 'pending')
    RETURNING id, created_at
"""
Q_MARK_SENT = "UPDATE notifications SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = $1"
Q_MARK_FAILED = "UPDATE notifications SET status = 'failed', error_reason = $2, updated_at = now() WHERE id = $1"
Q_MARK_DEAD_LETTER = "UPDATE notifications SET status = 'dead_letter', error_reason = $2, retry_count = $3, updated_at = now() WHERE id = $1"
Q_GET_TEMPLATE = "SELECT id, name, channel, subject, body, variables FROM templates WHERE id = $1"
Q_REMOVE_PUSH_TOKEN = """
    UPDATE subscribers SET
        push_tokens = (
            SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
            FROM jsonb_array_elements(push_tokens) t
            WHERE t->>'token' != $2
        ),
        updated_at = now()
    WHERE id = $1
"""


class _PermanentPushError(Exception):
    pass


@celery_app.task(bind=True, **PUSH_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload,
            notification_id=None, overrides=None, platform=None):
    # 1. Get subscriber — check for push_tokens
    subscriber = execute_read_one_query(Q_GET_SUBSCRIBER, [uuid.UUID(subscriber_id)])
    if not subscriber:
        log.warning("Subscriber %s not found", subscriber_id)
        return

    push_tokens = subscriber.get("push_tokens") or []
    if not push_tokens:
        log.warning("Subscriber %s has no push tokens — cannot send push notification", subscriber_id)
        return

    # 2. Filter tokens by platform if specified
    if platform:
        push_tokens = [t for t in push_tokens if t.get("platform") == platform]
        if not push_tokens:
            log.warning("Subscriber %s has no %s push tokens — skipping", subscriber_id, platform)
            return

    # 3. Get push provider credentials
    provider = execute_read_one_query(Q_GET_PUSH_PROVIDER, [uuid.UUID(team_id)])
    if not provider:
        log.warning("No push provider configured for team %s", team_id)
        return
    f = get_fernet()
    config = json.loads(f.decrypt(provider["config"]["encrypted"].encode()))

    overrides = overrides or {}

    # 4. Resolve template_id → template content
    template_id = template_data.get("template_id")
    if template_id:
        tmpl = execute_read_one_query(Q_GET_TEMPLATE, [uuid.UUID(template_id)])
        if tmpl:
            template_data = {**template_data, "subject": tmpl.get("subject", ""), "body": tmpl.get("body", "")}

    # 5. Render title + body via template engine
    title = render(template_data.get("title", template_data.get("subject", "")), payload, subscriber)
    body = render(template_data.get("body", ""), payload, subscriber)

    # 6. Extract push-specific fields
    image_url = template_data.get("image_url")
    deep_link = template_data.get("deep_link")
    data = template_data.get("data", {})
    silent = template_data.get("silent", False)

    # 7. Create notification row (if not retry)
    push_payload = {**(payload or {}), "image_url": image_url, "deep_link": deep_link, "silent": silent}
    if notification_id:
        notification = execute_read_one_query(Q_GET_NOTIFICATION, [uuid.UUID(notification_id)])
    else:
        new_id = uuid.uuid4()
        notification = execute_insert_query(Q_CREATE_NOTIFICATION, [
            new_id,
            uuid.UUID(team_id),
            uuid.UUID(subscriber_id),
            uuid.UUID(execution_id),
            (title or "")[:500],
            body,
            push_payload,
        ])
        if notification:
            notification["id"] = new_id

    nid = notification["id"] if notification else None

    try:
        # 8. Group tokens by platform type for dispatch
        fcm_tokens = [t["token"] for t in push_tokens if t.get("platform") in ("android", "web")]
        apns_tokens = [t["token"] for t in push_tokens if t.get("platform") == "ios"]

        invalid_tokens = []
        any_success = False

        # 9. Send to FCM tokens (Android + Web)
        if fcm_tokens and config.get("fcm_server_key"):
            results = _send_fcm(config, fcm_tokens, title, body, image_url, deep_link, data, silent)
            for token, success, error in results:
                if success:
                    any_success = True
                elif error in FCM_INVALID_TOKEN_ERRORS:
                    invalid_tokens.append(token)

        # 10. Send to APNs tokens (iOS)
        if apns_tokens and config.get("apns_key_id"):
            for token in apns_tokens:
                success, error = _send_apns(config, token, title, body, image_url, deep_link, data, silent)
                if success:
                    any_success = True
                elif error in ("BadDeviceToken", "Unregistered", "Gone"):
                    invalid_tokens.append(token)

        # 11. Clean up invalid tokens
        for token in invalid_tokens:
            try:
                execute_update_query(Q_REMOVE_PUSH_TOKEN, [uuid.UUID(subscriber_id), token])
                log.info("Removed invalid push token for subscriber %s: %s...", subscriber_id, token[:20])
            except Exception:
                pass

        # 12. Mark result
        if any_success:
            execute_update_query(Q_MARK_SENT, [nid])
        elif invalid_tokens and not any_success:
            # All tokens were invalid — permanent failure
            raise _PermanentPushError(f"All {len(invalid_tokens)} push tokens are invalid/expired")
        elif not fcm_tokens and not apns_tokens:
            # No tokens matched a supported platform — nothing to deliver.
            log.warning("No matching tokens for push delivery to subscriber %s", subscriber_id)
            return
        else:
            # Tokens existed but nothing succeeded and none were flagged invalid
            # (transient send failures, or provider key missing). Raise so Celery
            # retries; the generic handler dead-letters on exhaustion. Never leave
            # the notification silently stuck 'pending'.
            raise RuntimeError(
                f"Push delivery had no successes for subscriber {subscriber_id} "
                f"({len(fcm_tokens)} FCM, {len(apns_tokens)} APNs tokens)"
            )


    except _PermanentPushError as exc:
        log.error("Permanent push error for notification %s: %s", nid, exc)
        if nid:
            execute_update_query(Q_MARK_DEAD_LETTER, [nid, str(exc), self.request.retries])

    except Exception as exc:
        log.error("Push delivery failed for notification %s: %s", nid, exc)
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
                "platform": platform,
            })
        raise


def _send_fcm(config: dict, tokens: list[str], title: str, body: str,
              image_url: str | None, deep_link: str | None,
              data: dict, silent: bool) -> list[tuple[str, bool, str | None]]:
    """Send push via FCM legacy HTTP API. Returns list of (token, success, error_code)."""
    server_key = config["fcm_server_key"]

    fcm_payload = {
        "registration_ids": tokens,
    }

    if silent:
        fcm_payload["data"] = {**(data or {}), "title": title, "body": body}
        if deep_link:
            fcm_payload["data"]["deep_link"] = deep_link
    else:
        fcm_payload["notification"] = {"title": title, "body": body}
        if image_url:
            fcm_payload["notification"]["image"] = image_url
        if deep_link:
            fcm_payload["notification"]["click_action"] = deep_link
        if data:
            fcm_payload["data"] = data

    resp = httpx.post(
        "https://fcm.googleapis.com/fcm/send",
        headers={
            "Authorization": f"key={server_key}",
            "Content-Type": "application/json",
        },
        json=fcm_payload,
        timeout=15,
    )
    resp.raise_for_status()

    result_data = resp.json()
    results = []
    for i, r in enumerate(result_data.get("results", [])):
        token = tokens[i] if i < len(tokens) else ""
        if "error" in r:
            results.append((token, False, r["error"]))
        else:
            results.append((token, True, None))
    return results


def _send_apns(config: dict, token: str, title: str, body: str,
               image_url: str | None, deep_link: str | None,
               data: dict, silent: bool) -> tuple[bool, str | None]:
    """Send push via APNs HTTP/2 API. Returns (success, error_reason)."""
    key_id = config.get("apns_key_id", "")
    team_id = config.get("apns_team_id", "")
    bundle_id = config.get("apns_bundle_id", "")
    key_path = config.get("apns_key_path", "")

    if not key_id or not team_id or not bundle_id:
        return (False, "APNs config incomplete")

    # Build JWT for APNs auth
    try:
        import jwt as pyjwt
        with open(key_path, "r") as f:
            private_key = f.read()
        token_payload = {
            "iss": team_id,
            "iat": int(time.time()),
        }
        auth_token = pyjwt.encode(token_payload, private_key, algorithm="ES256", headers={"kid": key_id})
    except Exception as e:
        log.error("APNs JWT generation failed: %s", e)
        return (False, f"JWT error: {e}")

    # Build APNs payload
    if silent:
        aps = {"content-available": 1}
    else:
        alert = {"title": title, "body": body}
        aps = {"alert": alert, "sound": "default"}
        if image_url:
            aps["mutable-content"] = 1

    apns_payload = {"aps": aps}
    if data:
        apns_payload.update(data)
    if deep_link:
        apns_payload["deep_link"] = deep_link

    try:
        resp = httpx.post(
            f"https://api.push.apple.com/3/device/{token}",
            headers={
                "authorization": f"bearer {auth_token}",
                "apns-topic": bundle_id,
                "apns-push-type": "background" if silent else "alert",
            },
            json=apns_payload,
            http2=True,
            timeout=15,
        )

        if resp.status_code == 200:
            return (True, None)
        elif resp.status_code in (400, 410):
            error_data = resp.json() if resp.content else {}
            reason = error_data.get("reason", "Unknown")
            return (False, reason)
        else:
            resp.raise_for_status()
            return (True, None)
    except httpx.HTTPStatusError:
        raise
    except Exception as e:
        log.error("APNs send failed: %s", e)
        raise
