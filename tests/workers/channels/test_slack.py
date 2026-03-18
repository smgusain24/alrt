"""Tests for alrt_workers.tasks.channels.slack — Slack delivery task."""
import json
import uuid
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_subscriber, make_provider


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_self():
    mock = MagicMock()
    mock.request.retries = 0
    mock.max_retries = 3
    return mock


def _encrypted_config(bot_token="xoxb-test-token"):
    """Return a provider config dict that looks like encrypted BYOC/alrt_hosted config."""
    return {"encrypted": "ENCRYPTED_BLOB"}


def _mock_fernet(bot_token="xoxb-test-token"):
    """Return a mock Fernet that decrypts to a config with bot_token."""
    fernet = MagicMock()
    fernet.decrypt.return_value = json.dumps({"bot_token": bot_token}).encode()
    return fernet


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSlackDeliver:

    def test_send_success(self):
        """Subscriber with slack_user_id, valid provider -> message sent, notification marked sent."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, slack_user_id="U12345")
        provider = make_provider(
            team_id=team_id,
            channel="slack",
            provider_type="alrt_hosted",
            config=_encrypted_config(),
        )
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.slack.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.slack.execute_insert_query", return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}) as mock_insert, \
             patch("alrt_workers.tasks.channels.slack.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.slack.get_fernet", return_value=_mock_fernet()) as mock_fernet, \
             patch("alrt_workers.tasks.channels.slack.httpx") as mock_httpx:

            # Slack API returns {"ok": true}
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            resp.json.return_value = {"ok": True}
            mock_httpx.post.return_value = resp

            from alrt_workers.tasks.channels.slack import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub["id"]),
                str(team_id),
                {"title": "Hello", "body": "World"},
                {"key": "value"},
            )

            # HTTP call made to Slack API
            mock_httpx.post.assert_called_once()
            call_args = mock_httpx.post.call_args
            assert "slack.com" in call_args[0][0]

            # Notification created
            mock_insert.assert_called_once()

            # Notification marked sent + quota increment
            assert mock_update.call_count == 2
            sent_call = mock_update.call_args_list[0]
            assert "status = 'sent'" in sent_call[0][0]

    def test_non_retriable_error_marks_failed(self):
        """Slack returns {"ok": false, "error": "invalid_auth"} -> notification marked failed."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, slack_user_id="U12345")
        provider = make_provider(
            team_id=team_id,
            channel="slack",
            provider_type="alrt_hosted",
            config=_encrypted_config(),
        )
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.slack.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.slack.execute_insert_query", return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}) as mock_insert, \
             patch("alrt_workers.tasks.channels.slack.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.slack.get_fernet", return_value=_mock_fernet()), \
             patch("alrt_workers.tasks.channels.slack.httpx") as mock_httpx:

            # Slack API returns non-retriable error
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            resp.json.return_value = {"ok": False, "error": "invalid_auth"}
            mock_httpx.post.return_value = resp

            from alrt_workers.tasks.channels.slack import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub["id"]),
                str(team_id),
                {"title": "Hello", "body": "World"},
                {},
            )

            # Notification marked dead_letter (permanent errors go to DLQ)
            assert mock_update.call_count == 1
            failed_call = mock_update.call_args_list[0]
            assert "status = 'dead_letter'" in failed_call[0][0]
