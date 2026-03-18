"""Tests for alrt_workers.tasks.channels.sms — SMS delivery task."""
import uuid
from unittest.mock import patch, MagicMock

from tests.fixtures.data import make_subscriber


def _mock_self():
    mock = MagicMock()
    mock.request.retries = 0
    mock.max_retries = 5
    return mock


def _mock_httpx_response(status_code=200, text="ok"):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


class TestSMSHappyPath:

    def test_twilio_send(self):
        """Twilio provider: subscriber with phone -> notification created and marked sent."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        provider = {
            "id": uuid.uuid4(), "team_id": team_id, "channel": "sms",
            "provider_type": "twilio", "config": {"encrypted": "fake"},
            "is_active": True,
        }
        notif_id = uuid.uuid4()
        decrypted_config = {"account_sid": "AC123", "auth_token": "tok123", "from_number": "+15550001111"}

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        mock_fernet = MagicMock()
        mock_fernet.decrypt.return_value = b'{"account_sid":"AC123","auth_token":"tok123","from_number":"+15550001111"}'

        with patch("alrt_workers.tasks.channels.sms.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.sms.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.sms.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.sms.get_fernet", return_value=mock_fernet), \
             patch("alrt_workers.tasks.channels.sms.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(201)

            from alrt_workers.tasks.channels.sms import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"body": "Hello {{subscriber.name}}"},
                {"order_id": "42"},
            )

            mock_httpx.post.assert_called_once()
            call_args = mock_httpx.post.call_args
            assert "twilio.com" in call_args[0][0]

    def test_kaleyra_send_with_dlt(self):
        """Kaleyra provider with DLT fields sends successfully."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="919876543210")
        provider = {
            "id": uuid.uuid4(), "team_id": team_id, "channel": "sms",
            "provider_type": "kaleyra", "config": {"encrypted": "fake"},
            "is_active": True,
        }

        mock_fernet = MagicMock()
        mock_fernet.decrypt.return_value = b'{"api_key":"key123","sid":"sid123","sender_id":"ALRTDV"}'

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.sms.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.sms.execute_insert_query",
                   return_value={"id": uuid.uuid4(), "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.sms.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.sms.get_fernet", return_value=mock_fernet), \
             patch("alrt_workers.tasks.channels.sms.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(200)

            from alrt_workers.tasks.channels.sms import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"body": "Your OTP is 1234", "dlt_entity_id": "1234567890", "dlt_template_id": "0987654321"},
                {},
            )

            mock_httpx.post.assert_called_once()
            call_args = mock_httpx.post.call_args
            assert "kaleyra.io" in call_args[0][0]


class TestSMSValidation:

    def test_no_phone_skips(self):
        """Subscriber without phone_number returns early."""
        sub = make_subscriber(phone_number=None)
        with patch("alrt_workers.tasks.channels.sms.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.sms.execute_insert_query") as mock_insert:
            from alrt_workers.tasks.channels.sms import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})
            mock_insert.assert_not_called()

    def test_no_provider_skips(self):
        """No SMS provider configured returns early."""
        sub = make_subscriber(phone_number="+15551234567")

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return None
            return None

        with patch("alrt_workers.tasks.channels.sms.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.sms.execute_insert_query") as mock_insert:
            from alrt_workers.tasks.channels.sms import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()), {"body": "Hi"}, {})
            mock_insert.assert_not_called()

    def test_kaleyra_missing_dlt_skips(self):
        """Kaleyra without DLT fields returns early without creating notification."""
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="919876543210")
        provider = {
            "id": uuid.uuid4(), "team_id": team_id, "channel": "sms",
            "provider_type": "kaleyra", "config": {"encrypted": "fake"},
            "is_active": True,
        }

        mock_fernet = MagicMock()
        mock_fernet.decrypt.return_value = b'{"api_key":"key123","sid":"sid123","sender_id":"ALRTDV"}'

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.sms.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.sms.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.sms.get_fernet", return_value=mock_fernet), \
             patch("alrt_workers.tasks.channels.sms.httpx") as mock_httpx:
            from alrt_workers.tasks.channels.sms import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(team_id),
                    {"body": "No DLT fields"}, {})
            mock_httpx.post.assert_not_called()


class TestSMSErrorHandling:

    def test_permanent_error_dead_letter(self):
        """HTTP 400 from Twilio marks notification as dead_letter."""
        team_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id, phone_number="+15551234567")
        provider = {
            "id": uuid.uuid4(), "team_id": team_id, "channel": "sms",
            "provider_type": "twilio", "config": {"encrypted": "fake"},
            "is_active": True,
        }

        mock_fernet = MagicMock()
        mock_fernet.decrypt.return_value = b'{"account_sid":"AC123","auth_token":"tok123","from_number":"+15550001111"}'

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.sms.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.sms.execute_insert_query",
                   return_value={"id": uuid.uuid4(), "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.sms.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.sms.get_fernet", return_value=mock_fernet), \
             patch("alrt_workers.tasks.channels.sms.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(400, "Bad Request")

            from alrt_workers.tasks.channels.sms import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(team_id),
                    {"body": "Test"}, {})

            # Should have called update with dead_letter status
            calls = [str(c) for c in mock_update.call_args_list]
            assert any("dead_letter" in c for c in calls)
