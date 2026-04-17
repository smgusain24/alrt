"""Tests for Telegram channel delivery task.

Covers: text message delivery, parse mode, message truncation (4096 chars),
        error handling (permanent errors, 429 rate limiting), retry exhaustion -> DLQ.

Mocking strategy:
    - DB: patches execute_{read_one,insert,update}_query at module level
    - HTTP: patches httpx.post for Telegram Bot API calls
    - Env: patches os.environ for TELEGRAM_BOT_TOKEN
"""
import uuid
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_subscriber, make_template

# Pre-import the module so patch() can resolve attributes on it
import alrt_workers.tasks.channels.telegram  # noqa: F401


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _Retry(Exception):
    """Sentinel exception to simulate Celery's self.retry() raising."""
    pass


def _mock_self(retries=0, max_retries=3):
    """Create a mock Celery task `self` with configurable retry state.

    self.retry() raises _Retry, matching Celery's real behavior where
    `raise self.retry(exc=...)` re-raises the retry exception.
    """
    mock = MagicMock()
    mock.request.retries = retries
    mock.max_retries = max_retries
    mock.retry.side_effect = _Retry("retry")
    return mock


def _mock_httpx_response(status_code=200, json_data=None, text="ok"):
    """Create a mock httpx response for Telegram Bot API."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    if json_data is None:
        json_data = {"ok": True, "result": {"message_id": 123}}
    resp.json.return_value = json_data
    if status_code < 400:
        resp.raise_for_status = MagicMock()
    else:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


# Standard environment variables for Telegram tests
TG_ENV = {"TELEGRAM_BOT_TOKEN": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"}


# ---------------------------------------------------------------------------
# Happy Path — successful delivery scenarios
# ---------------------------------------------------------------------------

class TestTelegramHappyPath:
    """Successful delivery — text messages, parse mode, template resolution."""

    def test_send_creates_notification_and_marks_sent(self):
        """Subscriber with telegram_chat_id + BOT_TOKEN set -> sendMessage called, marked sent."""
        # Arrange
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, telegram_chat_id="987654321")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}) as mock_insert, \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"body": "Hello {{payload.name}}!"},
                {"name": "Alice"},
            )

            # Assert — notification created
            mock_insert.assert_called_once()
            # Assert — Telegram Bot API called
            mock_httpx.post.assert_called_once()
            call_url = mock_httpx.post.call_args[0][0]
            assert "api.telegram.org" in call_url
            assert "sendMessage" in call_url
            # Assert — marked sent
            assert mock_update.call_count == 1

    def test_long_message_truncated_to_4096_chars(self):
        """Message body exceeding 4096 chars -> truncated to Telegram's hard limit."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")
        notif_id = uuid.uuid4()
        long_body = "A" * 5000  # Exceeds 4096 char limit

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"body": long_body},
                {},
            )

            # Assert — text truncated to 4096 chars
            json_body = mock_httpx.post.call_args[1]["json"]
            assert len(json_body["text"]) == 4096

    def test_parse_mode_passed_to_api(self):
        """parse_mode from template_data -> included in Telegram API payload."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"body": "**Bold text**", "parse_mode": "MarkdownV2"},
                {},
            )

            # Assert — parse_mode in API payload
            json_body = mock_httpx.post.call_args[1]["json"]
            assert json_body["parse_mode"] == "MarkdownV2"

    def test_template_id_resolves_from_database(self):
        """template_data with template_id -> DB lookup replaces body with template content."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, telegram_chat_id="987654321")
        template = make_template(body="Welcome {{payload.user}}!")
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "templates" in query:
                return template
            return None

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query",
                   side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"template_id": str(template["id"])},
                {"user": "Bob"},
            )

            # Assert — rendered template body sent
            json_body = mock_httpx.post.call_args[1]["json"]
            assert "Welcome Bob!" in json_body["text"]


# ---------------------------------------------------------------------------
# Validation — early-exit scenarios
# ---------------------------------------------------------------------------

class TestTelegramValidation:
    """Early-exit scenarios — missing chat_id, missing subscriber, missing bot token."""

    def test_no_chat_id_skips_delivery(self):
        """Subscriber without telegram_chat_id -> returns without creating notification."""
        # Arrange
        sub = make_subscriber(telegram_chat_id=None)

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx:

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert
            mock_insert.assert_not_called()
            mock_httpx.post.assert_not_called()

    def test_subscriber_not_found_returns_early(self):
        """execute_read_one_query returns None -> returns without any side effects."""
        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=None), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query") as mock_insert:

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert
            mock_insert.assert_not_called()

    def test_missing_bot_token_returns_early(self):
        """No TELEGRAM_BOT_TOKEN env var -> returns without sending."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", {"TELEGRAM_BOT_TOKEN": ""}, clear=False):

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert
            mock_httpx.post.assert_not_called()


# ---------------------------------------------------------------------------
# Error Handling — permanent errors, rate limiting, DLQ
# ---------------------------------------------------------------------------

class TestTelegramErrorHandling:
    """Error paths — permanent errors, rate limiting (429), retry exhaustion."""

    def test_permanent_error_marks_dead_letter(self):
        """HTTP 403 (bot blocked by user) -> _PermanentTelegramError -> dead_letter."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            resp = MagicMock()
            resp.status_code = 403
            resp.text = "Forbidden: bot was blocked by the user"
            mock_httpx.post.return_value = resp

            # Act
            from alrt_workers.tasks.channels.telegram import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"body": "Hello"},
                {},
            )

            # Assert — dead_letter update called
            dead_letter_calls = [c for c in mock_update.call_args_list if "dead_letter" in c[0][0]]
            assert len(dead_letter_calls) == 1

    def test_rate_limited_retries_with_countdown(self):
        """HTTP 429 with retry_after=10 -> _TelegramRateLimited -> self.retry(countdown=10)."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=0, max_retries=3)

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            # HTTP 429 with retry_after in response body
            resp = MagicMock()
            resp.status_code = 429
            resp.text = "Too Many Requests"
            resp.json.return_value = {"parameters": {"retry_after": 10}}
            mock_httpx.post.return_value = resp

            # Act — retry raises _Retry (simulating Celery's real behavior)
            from alrt_workers.tasks.channels.telegram import deliver
            with pytest.raises(_Retry):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"body": "Hello"},
                    {},
                )

            # Assert — retry called with countdown=10
            mock_self.retry.assert_called_once()
            assert mock_self.retry.call_args[1]["countdown"] == 10

    def test_rate_limit_exhaustion_marks_dead_letter(self):
        """429 + retries >= max_retries -> dead_letter and exception re-raised."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=3, max_retries=3)

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            resp = MagicMock()
            resp.status_code = 429
            resp.text = "Too Many Requests"
            resp.json.return_value = {"parameters": {"retry_after": 10}}
            mock_httpx.post.return_value = resp

            # Act + Assert — exception re-raised
            from alrt_workers.tasks.channels.telegram import deliver
            with pytest.raises(Exception):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"body": "Hello"},
                    {},
                )

            # Assert — dead_letter update called
            dead_letter_calls = [c for c in mock_update.call_args_list if "dead_letter" in c[0][0]]
            assert len(dead_letter_calls) == 1

    def test_api_ok_false_raises_runtime_error(self):
        """HTTP 200 but ok=false in response -> RuntimeError raised (transient error path)."""
        # Arrange
        sub = make_subscriber(telegram_chat_id="987654321")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=0, max_retries=3)

        with patch("alrt_workers.tasks.channels.telegram.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.telegram.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.telegram.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.telegram.httpx") as mock_httpx, \
             patch.dict("os.environ", TG_ENV):

            # HTTP 200 but ok=false (logical error from Telegram API)
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            resp.json.return_value = {"ok": False, "description": "Bad Request: chat not found"}
            mock_httpx.post.return_value = resp

            # Act — RuntimeError caught by generic except, triggers retry which raises _Retry
            from alrt_workers.tasks.channels.telegram import deliver
            with pytest.raises(_Retry):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"body": "Hello"},
                    {},
                )

            # Assert — retry called (RuntimeError is a transient/generic error)
            mock_self.retry.assert_called_once()
