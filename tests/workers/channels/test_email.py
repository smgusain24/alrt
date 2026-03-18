"""Tests for alrt_workers.tasks.channels.email — email delivery task."""
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


def _mock_httpx_response(status_code=200, text="ok"):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestEmailDeliver:

    def test_alrt_hosted_send(self):
        """alrt_hosted provider: subscriber with email -> notification created and marked sent."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, email="user@test.com")
        provider = make_provider(
            team_id=team_id,
            channel="email",
            provider_type="alrt_hosted",
            config={"display_name": "Test Team"},
        )
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.email.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.email.execute_insert_query", return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}) as mock_insert, \
             patch("alrt_workers.tasks.channels.email.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.email.httpx") as mock_httpx, \
             patch.dict("os.environ", {"RESEND_API_KEY": "re_test_key"}):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            from alrt_workers.tasks.channels.email import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub["id"]),
                str(team_id),
                {"subject": "Hello", "body": "World"},
                {"key": "value"},
            )

            # HTTP call made to Resend API
            mock_httpx.post.assert_called_once()
            call_kwargs = mock_httpx.post.call_args
            assert "api.resend.com" in call_kwargs[0][0]

            # Notification created
            mock_insert.assert_called_once()

            # Notification marked sent (first update call) + quota increment (second)
            assert mock_update.call_count == 2
            sent_call = mock_update.call_args_list[0]
            assert "status = 'sent'" in sent_call[0][0]

    def test_no_subscriber_email_skips(self):
        """Subscriber without email -> returns without sending."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, email=None)

        with patch("alrt_workers.tasks.channels.email.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.email.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.email.httpx") as mock_httpx:

            from alrt_workers.tasks.channels.email import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub["id"]),
                str(team_id),
                {"subject": "Hello", "body": "World"},
                {},
            )

            # No notification created, no HTTP call
            mock_insert.assert_not_called()
            mock_httpx.post.assert_not_called()

    def test_permanent_error_marks_failed(self):
        """HTTP 422 from provider -> _PermanentEmailError -> notification marked failed."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, email="user@test.com")
        provider = make_provider(
            team_id=team_id,
            channel="email",
            provider_type="alrt_hosted",
            config={"display_name": "Test Team"},
        )
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.email.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.email.execute_insert_query", return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}) as mock_insert, \
             patch("alrt_workers.tasks.channels.email.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.email.httpx") as mock_httpx, \
             patch.dict("os.environ", {"RESEND_API_KEY": "re_test_key"}):

            # Return 422 -> triggers _PermanentEmailError
            resp = MagicMock()
            resp.status_code = 422
            resp.text = "Unprocessable Entity"
            mock_httpx.post.return_value = resp

            from alrt_workers.tasks.channels.email import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub["id"]),
                str(team_id),
                {"subject": "Hello", "body": "World"},
                {},
            )

            # Notification marked dead_letter (permanent errors go to DLQ)
            assert mock_update.call_count == 1
            failed_call = mock_update.call_args_list[0]
            assert "status = 'dead_letter'" in failed_call[0][0]
