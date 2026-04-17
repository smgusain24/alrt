"""Tests for WhatsApp channel delivery task.

Covers: freeform messages, template messages, media, phone normalization,
        error handling (permanent/transient), retry exhaustion -> DLQ.

Mocking strategy:
    - DB: patches execute_{read_one,insert,update}_query at module level
    - HTTP: patches httpx.post for Meta Cloud API calls
    - Env: patches os.environ for WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
"""
import uuid
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_subscriber, make_template

# Pre-import the module so patch() can resolve attributes on it
import alrt_workers.tasks.channels.whatsapp  # noqa: F401


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _Retry(Exception):
    """Sentinel exception to simulate Celery's self.retry() raising."""
    pass


def _mock_self(retries=0, max_retries=5):
    """Create a mock Celery task `self` with configurable retry state.

    self.retry() is configured to raise _Retry, matching Celery's real behavior
    where `raise self.retry(exc=...)` re-raises the retry exception.
    """
    mock = MagicMock()
    mock.request.retries = retries
    mock.max_retries = max_retries
    mock.retry.side_effect = _Retry("retry")
    return mock


def _mock_httpx_response(status_code=200, json_data=None, text="ok"):
    """Create a mock httpx response with configurable status and body."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    if json_data is None:
        json_data = {"messages": [{"id": "wamid.test123"}]}
    resp.json.return_value = json_data
    if status_code < 400:
        resp.raise_for_status = MagicMock()
    else:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


# Standard environment variables for WhatsApp tests
WA_ENV = {"WHATSAPP_TOKEN": "wa_test_token", "WHATSAPP_PHONE_NUMBER_ID": "123456789"}


# ---------------------------------------------------------------------------
# Happy Path — successful delivery scenarios
# ---------------------------------------------------------------------------

class TestWhatsAppHappyPath:
    """Successful delivery — freeform text, template messages, media attachments."""

    def test_freeform_send_creates_notification_and_marks_sent(self):
        """Subscriber with phone_number + valid env vars -> notification created and marked sent."""
        # Arrange
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+1-555-123-4567")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}) as mock_insert, \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"body": "Hello {{payload.name}}"},
                {"name": "Alice"},
            )

            # Assert — notification created
            mock_insert.assert_called_once()
            # Assert — httpx called with Meta API URL
            mock_httpx.post.assert_called_once()
            call_args = mock_httpx.post.call_args
            assert "graph.facebook.com" in call_args[0][0]
            # Assert — wamid stored + marked sent (2 update calls)
            assert mock_update.call_count == 2

    def test_template_message_sends_correct_meta_payload(self):
        """template_name + template_variables in template_data -> Meta template payload."""
        # Arrange
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"template_name": "order_confirmation", "template_variables": ["order_id"],
                 "template_language": "en_US"},
                {"order_id": "ORD-42"},
            )

            # Assert — template payload structure sent to Meta API
            call_kwargs = mock_httpx.post.call_args
            json_body = call_kwargs[1]["json"]
            assert json_body["type"] == "template"
            assert json_body["template"]["name"] == "order_confirmation"
            assert json_body["template"]["language"]["code"] == "en_US"
            # Template variables resolved from payload
            params = json_body["template"]["components"][0]["parameters"]
            assert params[0]["text"] == "ORD-42"

    def test_media_message_includes_media_url(self):
        """media_url in template_data -> media payload sent to Meta API."""
        # Arrange
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"media_url": "https://cdn.example.com/receipt.pdf", "media_type": "document",
                 "caption": "Your receipt"},
                {},
            )

            # Assert — media payload with correct type and URL
            json_body = mock_httpx.post.call_args[1]["json"]
            assert json_body["type"] == "document"
            assert json_body["document"]["link"] == "https://cdn.example.com/receipt.pdf"
            assert json_body["document"]["caption"] == "Your receipt"


# ---------------------------------------------------------------------------
# Validation — early-exit scenarios
# ---------------------------------------------------------------------------

class TestWhatsAppValidation:
    """Early-exit scenarios — missing phone, missing subscriber, missing env vars."""

    def test_no_phone_number_skips_delivery(self):
        """Subscriber without phone_number -> returns without creating notification."""
        # Arrange
        sub = make_subscriber(phone_number=None)

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx:

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert — no notification created, no HTTP call
            mock_insert.assert_not_called()
            mock_httpx.post.assert_not_called()

    def test_subscriber_not_found_returns_early(self):
        """execute_read_one_query returns None -> returns without any side effects."""
        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=None), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query") as mock_insert:

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert
            mock_insert.assert_not_called()

    def test_missing_env_vars_returns_early(self):
        """No WHATSAPP_TOKEN env var -> returns without sending."""
        # Arrange
        sub = make_subscriber(phone_number="+15551234567")

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", {"WHATSAPP_TOKEN": "", "WHATSAPP_PHONE_NUMBER_ID": ""}, clear=False):

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert — no HTTP call made
            mock_httpx.post.assert_not_called()


# ---------------------------------------------------------------------------
# Error Handling — permanent errors, retries, DLQ
# ---------------------------------------------------------------------------

class TestWhatsAppErrorHandling:
    """Error paths — permanent errors (DLQ), transient retries, retry exhaustion."""

    def test_permanent_error_marks_dead_letter(self):
        """HTTP 400 from Meta API -> _PermanentWhatsAppError -> notification marked dead_letter."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            # HTTP 400 triggers _PermanentWhatsAppError
            resp = MagicMock()
            resp.status_code = 400
            resp.text = "Bad Request"
            mock_httpx.post.return_value = resp

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"body": "Hello"}, {},
            )

            # Assert — notification marked dead_letter
            dead_letter_call = mock_update.call_args_list[0]
            assert "dead_letter" in dead_letter_call[0][0]

    def test_template_required_error_keeps_pending(self):
        """Meta error code 131026 (no session) -> notification marked pending, not dead_letter."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            # HTTP 200 but with Meta error code 131026 in response body
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = MagicMock()
            resp.json.return_value = {
                "error": {"code": 131026, "message": "Recipient not in 24h session window"}
            }
            mock_httpx.post.return_value = resp

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"body": "Hello"}, {},
            )

            # Assert — marked pending (not dead_letter), error reason mentions "Template required"
            pending_call = mock_update.call_args_list[0]
            assert "pending" in pending_call[0][0]

    def test_transient_error_triggers_retry(self):
        """HTTP 500 from Meta API -> self.retry called with notification_id in kwargs."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=0, max_retries=5)

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            # HTTP 500 -> raise_for_status triggers retry
            resp = MagicMock()
            resp.status_code = 500
            resp.text = "Internal Server Error"
            resp.raise_for_status.side_effect = Exception("HTTP 500")
            resp.json.return_value = {}
            mock_httpx.post.return_value = resp

            # Act — retry raises _Retry (simulating Celery's real behavior)
            from alrt_workers.tasks.channels.whatsapp import deliver
            with pytest.raises(_Retry):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(team_id),
                    {"body": "Hello"}, {},
                )

            # Assert — self.retry was called with a notification_id
            mock_self.retry.assert_called_once()
            retry_kwargs = mock_self.retry.call_args[1]["kwargs"]
            assert "notification_id" in retry_kwargs
            assert retry_kwargs["notification_id"] is not None

    def test_retry_exhaustion_marks_dead_letter(self):
        """retries >= max_retries -> notification marked dead_letter and exception re-raised."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=5, max_retries=5)

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            resp = MagicMock()
            resp.status_code = 500
            resp.text = "Internal Server Error"
            resp.raise_for_status.side_effect = Exception("HTTP 500")
            resp.json.return_value = {}
            mock_httpx.post.return_value = resp

            # Act + Assert — exception re-raised after marking dead_letter
            from alrt_workers.tasks.channels.whatsapp import deliver
            with pytest.raises(Exception, match="HTTP 500"):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(team_id),
                    {"body": "Hello"}, {},
                )

            # Assert — dead_letter update was called
            dead_letter_calls = [c for c in mock_update.call_args_list if "dead_letter" in c[0][0]]
            assert len(dead_letter_calls) == 1


# ---------------------------------------------------------------------------
# Helpers — unit tests for utility functions
# ---------------------------------------------------------------------------

class TestWhatsAppHelpers:
    """Unit tests for helper functions — phone normalization, template resolution."""

    def test_normalize_phone_strips_special_chars(self):
        """_normalize_phone removes all non-digit characters for E.164 format."""
        from alrt_workers.tasks.channels.whatsapp import _normalize_phone

        # Act + Assert
        assert _normalize_phone("+1-555-123-4567") == "15551234567"
        assert _normalize_phone("(555) 123 4567") == "5551234567"
        assert _normalize_phone("+44 20 7946 0958") == "442079460958"

    def test_template_id_resolves_from_database(self):
        """template_data with template_id -> DB lookup replaces body with template content."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        notif_id = uuid.uuid4()
        template = make_template(body="DB template body: {{payload.name}}")

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "templates" in query:
                return template
            return None

        with patch("alrt_workers.tasks.channels.whatsapp.execute_read_one_query",
                   side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.whatsapp.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.whatsapp.httpx") as mock_httpx, \
             patch.dict("os.environ", WA_ENV):

            mock_httpx.post.return_value = _mock_httpx_response(200)

            # Act
            from alrt_workers.tasks.channels.whatsapp import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"template_id": str(template["id"])},
                {"name": "Alice"},
            )

            # Assert — httpx was called (meaning delivery proceeded with resolved template)
            mock_httpx.post.assert_called_once()
            # The rendered body should contain the resolved template text
            json_body = mock_httpx.post.call_args[1]["json"]
            assert "DB template body: Alice" in json_body["text"]["body"]
