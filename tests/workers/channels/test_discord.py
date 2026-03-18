"""Tests for Discord channel delivery task.

Covers: subscriber webhook delivery, team provider fallback with decryption,
        embed formatting (color parsing, plain content), error handling,
        retry exhaustion -> DLQ.

Mocking strategy:
    - DB: patches execute_{read_one,insert,update}_query at module level
    - HTTP: patches httpx.post for Discord webhook calls
    - Crypto: patches get_fernet for provider config decryption
"""
import json
import uuid
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_subscriber, make_provider, make_template

# Pre-import the module so patch() can resolve attributes on it
import alrt_workers.tasks.channels.discord  # noqa: F401


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


def _mock_httpx_response(status_code=204, text=""):
    """Create a mock httpx response. Discord returns 204 No Content on success."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    else:
        resp.raise_for_status = MagicMock()
    return resp


def _mock_fernet(config_dict):
    """Create a mock Fernet that decrypts to the given config dict."""
    mock_f = MagicMock()
    mock_f.decrypt.return_value = json.dumps(config_dict).encode()
    return mock_f


# ---------------------------------------------------------------------------
# Happy Path — successful delivery scenarios
# ---------------------------------------------------------------------------

class TestDiscordHappyPath:
    """Successful delivery — subscriber webhook, team provider fallback, embed formatting."""

    def test_subscriber_webhook_sends_embed(self):
        """Subscriber with discord_webhook_url -> embed message sent via webhook."""
        # Arrange
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(204)

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"title": "New Order", "body": "Order #{{payload.id}} placed", "color": "3b82f6"},
                {"id": "42"},
            )

            # Assert — webhook called with embed payload
            mock_httpx.post.assert_called_once()
            call_args = mock_httpx.post.call_args
            assert call_args[0][0] == "https://discord.com/api/webhooks/123/abc"
            json_body = call_args[1]["json"]
            assert "embeds" in json_body
            # Assert — notification marked sent + quota incremented
            assert mock_update.call_count == 2

    def test_team_provider_fallback_decrypts_and_sends(self):
        """No subscriber webhook URL -> falls back to team Discord provider, decrypts config."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, discord_webhook_url=None)
        provider = make_provider(
            team_id=team_id, channel="discord", provider_type="alrt_hosted",
            config={"encrypted": "encrypted_blob"},
        )
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query",
                   side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx, \
             patch("alrt_workers.tasks.channels.discord.get_fernet",
                   return_value=_mock_fernet({"webhook_url": "https://discord.com/api/webhooks/456/def"})):

            mock_httpx.post.return_value = _mock_httpx_response(204)

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"title": "Alert", "body": "Something happened"},
                {},
            )

            # Assert — webhook called with decrypted URL
            call_url = mock_httpx.post.call_args[0][0]
            assert call_url == "https://discord.com/api/webhooks/456/def"

    def test_plain_content_when_embed_disabled(self):
        """embed_enabled=False -> plain content message instead of embed."""
        # Arrange
        sub = make_subscriber(discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(204)

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"body": "Plain message", "embed_enabled": False},
                {},
            )

            # Assert — plain content, not embeds
            json_body = mock_httpx.post.call_args[1]["json"]
            assert "content" in json_body
            assert "embeds" not in json_body

    def test_embed_color_parsed_from_hex(self):
        """Hex color string '#ff5500' -> parsed to integer for Discord embed."""
        # Arrange
        sub = make_subscriber(discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(204)

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"title": "Alert", "body": "Test", "color": "#ff5500"},
                {},
            )

            # Assert — color parsed to integer: 0xff5500 = 16733440
            json_body = mock_httpx.post.call_args[1]["json"]
            embed_color = json_body["embeds"][0]["color"]
            assert embed_color == 0xFF5500

    def test_invalid_color_uses_default(self):
        """Invalid color hex string -> falls back to default blue (0x3B82F6)."""
        # Arrange
        sub = make_subscriber(discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(204)

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"title": "Alert", "body": "Test", "color": "not-a-color"},
                {},
            )

            # Assert — default blue color: 0x3B82F6 = 3899126
            json_body = mock_httpx.post.call_args[1]["json"]
            embed_color = json_body["embeds"][0]["color"]
            assert embed_color == 0x3B82F6

    def test_template_id_resolves_from_database(self):
        """template_data with template_id -> DB lookup replaces body with template content."""
        # Arrange
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        template = make_template(body="DB body: {{payload.msg}}")
        notif_id = uuid.uuid4()

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "templates" in query:
                return template
            return None

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query",
                   side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(204)

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"template_id": str(template["id"]), "title": "Alert"},
                {"msg": "hello"},
            )

            # Assert — template body rendered with payload
            json_body = mock_httpx.post.call_args[1]["json"]
            description = json_body["embeds"][0]["description"]
            assert "DB body: hello" in description


# ---------------------------------------------------------------------------
# Validation — early-exit scenarios
# ---------------------------------------------------------------------------

class TestDiscordValidation:
    """Early-exit scenarios — missing webhook URL, missing subscriber."""

    def test_no_webhook_url_skips_delivery(self):
        """No subscriber webhook URL and no team provider -> returns without notification."""
        # Arrange
        sub = make_subscriber(discord_webhook_url=None)

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            return None  # No provider found

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query",
                   side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert
            mock_insert.assert_not_called()
            mock_httpx.post.assert_not_called()

    def test_subscriber_not_found_returns_early(self):
        """execute_read_one_query returns None -> returns without any side effects."""
        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=None), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query") as mock_insert:

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()), {"body": "Hi"}, {})

            # Assert
            mock_insert.assert_not_called()


# ---------------------------------------------------------------------------
# Error Handling — permanent errors, retries, DLQ
# ---------------------------------------------------------------------------

class TestDiscordErrorHandling:
    """Error paths — permanent errors (DLQ), transient retries, retry exhaustion."""

    def test_permanent_error_marks_dead_letter(self):
        """HTTP 404 (webhook deleted) -> _PermanentDiscordError -> notification marked dead_letter."""
        # Arrange
        sub = make_subscriber(discord_webhook_url="https://discord.com/api/webhooks/deleted/url")
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            # HTTP 404 triggers _PermanentDiscordError
            resp = MagicMock()
            resp.status_code = 404
            resp.text = "Unknown Webhook"
            resp.raise_for_status.side_effect = Exception("HTTP 404")
            mock_httpx.post.return_value = resp

            # Act
            from alrt_workers.tasks.channels.discord import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                {"title": "Alert", "body": "Test"},
                {},
            )

            # Assert — dead_letter update called
            dead_letter_calls = [c for c in mock_update.call_args_list if "dead_letter" in c[0][0]]
            assert len(dead_letter_calls) == 1

    def test_transient_error_triggers_retry(self):
        """HTTP 500 -> self.retry called with notification_id in kwargs."""
        # Arrange
        sub = make_subscriber(discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=0, max_retries=3)

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            resp = MagicMock()
            resp.status_code = 500
            resp.text = "Internal Server Error"
            resp.raise_for_status.side_effect = Exception("HTTP 500")
            mock_httpx.post.return_value = resp

            # Act — retry raises _Retry (simulating Celery's real behavior)
            from alrt_workers.tasks.channels.discord import deliver
            with pytest.raises(_Retry):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"title": "Alert", "body": "Test"},
                    {},
                )

            # Assert — retry called with a notification_id
            mock_self.retry.assert_called_once()
            retry_kwargs = mock_self.retry.call_args[1]["kwargs"]
            assert "notification_id" in retry_kwargs
            assert retry_kwargs["notification_id"] is not None

    def test_retry_exhaustion_marks_dead_letter(self):
        """retries >= max_retries -> notification marked dead_letter and exception re-raised."""
        # Arrange
        sub = make_subscriber(discord_webhook_url="https://discord.com/api/webhooks/123/abc")
        notif_id = uuid.uuid4()
        mock_self = _mock_self(retries=3, max_retries=3)

        with patch("alrt_workers.tasks.channels.discord.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.discord.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.discord.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.discord.httpx") as mock_httpx:

            resp = MagicMock()
            resp.status_code = 500
            resp.text = "Internal Server Error"
            resp.raise_for_status.side_effect = Exception("HTTP 500")
            mock_httpx.post.return_value = resp

            # Act + Assert — exception re-raised
            from alrt_workers.tasks.channels.discord import deliver
            with pytest.raises(Exception, match="HTTP 500"):
                deliver(
                    mock_self,
                    str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"title": "Alert", "body": "Test"},
                    {},
                )

            # Assert — dead_letter update called
            dead_letter_calls = [c for c in mock_update.call_args_list if "dead_letter" in c[0][0]]
            assert len(dead_letter_calls) == 1
