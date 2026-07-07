"""Factory functions for mock data. All return plain dicts matching DB row shapes."""
import uuid
from datetime import datetime, timezone


def make_team(*, id=None, name="Test Team"):
    return {
        "id": id or uuid.uuid4(),
        "name": name,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_user(*, id=None, email="test@example.com", team_id=None, role="admin",
              name="Test User", password_hash="$2b$12$fakehash", is_active=True):
    return {
        "id": id or uuid.uuid4(),
        "email": email,
        "password_hash": password_hash,
        "name": name,
        "avatar_url": None,
        "team_id": team_id or uuid.uuid4(),
        "role": role,
        "is_active": is_active,
        "email_verified": False,
        "last_login_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_subscriber(*, id=None, team_id=None, external_id="user-1",
                    email="user@test.com", name="Test User", slack_user_id=None,
                    phone_number=None, discord_webhook_url=None,
                    telegram_chat_id=None, push_tokens=None,
                    custom_properties=None,
                    channel_preferences=None, is_deleted=False):
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "external_id": external_id,
        "email": email,
        "name": name,
        "slack_user_id": slack_user_id,
        "phone_number": phone_number,
        "discord_webhook_url": discord_webhook_url,
        "telegram_chat_id": telegram_chat_id,
        "push_tokens": push_tokens or [],
        "custom_properties": custom_properties or {},
        "channel_preferences": channel_preferences or {},
        "is_deleted": is_deleted,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_workflow(*, id=None, team_id=None, event_name="test.event",
                  name="Test Workflow", status="published", definition=None,
                  category=None):
    if definition is None:
        definition = {
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {}},
                {"id": "email-1", "type": "channel", "data": {"channel": "email", "template": {"title": "Hi", "body": "Hello"}}},
            ],
            "edges": [
                {"source": "trigger-1", "target": "email-1"},
            ],
        }
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "name": name,
        "event_name": event_name,
        "category": category,
        "definition": definition,
        "status": status,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_execution(*, id=None, team_id=None, workflow_id=None,
                   subscriber_id=None, status="running", event_payload=None,
                   channels=None, overrides=None, idempotency_key=None):
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "workflow_id": workflow_id or uuid.uuid4(),
        "subscriber_id": subscriber_id or uuid.uuid4(),
        "event_payload": event_payload or {},
        "channels": channels,
        "overrides": overrides or {},
        "status": status,
        "idempotency_key": idempotency_key,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_notification(*, id=None, team_id=None, subscriber_id=None,
                      workflow_execution_id=None, channel="in_app",
                      title="Test", body="Hello", action_url=None,
                      payload=None, status="pending", error_reason=None,
                      is_read=False, is_archived=False):
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "subscriber_id": subscriber_id or uuid.uuid4(),
        "workflow_id": None,
        "workflow_execution_id": workflow_execution_id or uuid.uuid4(),
        "channel": channel,
        "title": title,
        "body": body,
        "action_url": action_url,
        "payload": payload or {},
        "status": status,
        "error_reason": error_reason,
        "is_read": is_read,
        "is_archived": is_archived,
        "sent_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_template(*, id=None, team_id=None, name="Welcome Email",
                  channel="email", subject="Hello {{name}}",
                  body="Hi {{name}}, welcome!", variables=None,
                  status="draft"):
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "name": name,
        "channel": channel,
        "subject": subject,
        "body": body,
        "variables": variables or ["name"],
        "status": status,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_encrypted_config(secrets: dict) -> dict:
    """Build a provider ``config`` dict whose ``encrypted`` field is a Fernet
    token decrypting to ``secrets`` (JSON).

    Channel delivery workers read per-team credentials via
    ``get_fernet().decrypt(provider["config"]["encrypted"].encode())``, so tests
    must supply the config in that exact shape. Uses the same ENCRYPTION_KEY the
    worker reads (set at import time in tests/conftest.py). Imported lazily so
    this module stays importable even where the worker package isn't on path.
    """
    import json

    from alrt_workers.utils.crypto import get_fernet

    return {"encrypted": get_fernet().encrypt(json.dumps(secrets).encode()).decode()}


def make_provider(*, id=None, team_id=None, channel="email",
                  provider_type="resend", config=None, is_active=True,
                  secrets=None):
    if config is None:
        config = make_encrypted_config(secrets) if secrets is not None else {}
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "channel": channel,
        "provider_type": provider_type,
        "config": config,
        "is_active": is_active,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_api_key(*, id=None, team_id=None, key_type="server",
                 key_prefix="alrt_sk_abcdef12", is_active=True, name=None):
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "key_hash": "a" * 64,
        "key_prefix": key_prefix,
        "key_type": key_type,
        "is_active": is_active,
        "name": name,
        "last_used_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }


def make_invite(*, id=None, team_id=None, email="invited@example.com",
                role="viewer", token_hash="b" * 64, invited_by=None,
                expires_at=None, accepted_at=None):
    return {
        "id": id or uuid.uuid4(),
        "team_id": team_id or uuid.uuid4(),
        "email": email,
        "role": role,
        "token_hash": token_hash,
        "invited_by": invited_by or uuid.uuid4(),
        "expires_at": expires_at or datetime(2099, 1, 1, tzinfo=timezone.utc),
        "accepted_at": accepted_at,
        "created_at": datetime.now(timezone.utc),
    }


