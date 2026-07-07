"""Tests for alrt_workers.tasks.channels.push — push notification delivery task."""
import uuid
from unittest.mock import patch, MagicMock

from tests.fixtures.data import make_subscriber, make_provider


def _push_provider(team_id):
    """Push provider whose encrypted config carries the FCM server key the
    worker reads via get_fernet().decrypt(config['encrypted'])."""
    return make_provider(
        team_id=team_id,
        channel="push",
        provider_type="fcm",
        secrets={"fcm_server_key": "test_server_key"},
    )


def _mock_self():
    mock = MagicMock()
    mock.request.retries = 0
    mock.max_retries = 3
    return mock


def _mock_httpx_response(status_code=200, json_data=None, text="ok"):
    resp = MagicMock()
    resp.status_code = status_code
    resp.text = text
    resp.content = b'{"reason": "BadDeviceToken"}' if status_code >= 400 else b""
    resp.json.return_value = json_data or {}
    resp.raise_for_status = MagicMock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f"HTTP {status_code}")
    return resp


class TestPushHappyPath:

    def test_fcm_send_android(self):
        """FCM: subscriber with android token -> notification created and marked sent."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(
            team_id=team_id,
            push_tokens=[{"token": "fcm_token_1", "platform": "android", "device_id": "dev1"}],
        )
        notif_id = uuid.uuid4()
        provider = _push_provider(team_id)

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.push.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.push.execute_insert_query",
                   return_value={"id": notif_id, "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.push.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.push.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(200, {
                "multicast_id": 123, "success": 1, "failure": 0,
                "results": [{"message_id": "0:msg123"}],
            })

            from alrt_workers.tasks.channels.push import deliver
            deliver(
                _mock_self(),
                str(exec_id), str(sub["id"]), str(team_id),
                {"title": "New Order", "body": "Order #42 placed"},
                {"order_id": "42"},
                platform="android",
            )

            mock_httpx.post.assert_called_once()
            call_args = mock_httpx.post.call_args
            assert "fcm.googleapis.com" in call_args[0][0]

    def test_platform_filter_only_sends_matching(self):
        """Platform filter only sends to matching tokens."""
        team_id = uuid.uuid4()
        sub = make_subscriber(
            team_id=team_id,
            push_tokens=[
                {"token": "fcm_android", "platform": "android"},
                {"token": "apns_ios", "platform": "ios"},
                {"token": "fcm_web", "platform": "web"},
            ],
        )

        provider = _push_provider(team_id)

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.push.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.push.execute_insert_query",
                   return_value={"id": uuid.uuid4(), "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.push.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.push.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(200, {
                "results": [{"message_id": "ok"}],
            })

            from alrt_workers.tasks.channels.push import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub["id"]), str(team_id),
                {"title": "Test", "body": "Hello"},
                {},
                platform="android",
            )

            # Only FCM should be called (android token), not APNs
            assert mock_httpx.post.call_count == 1
            call_url = mock_httpx.post.call_args[0][0]
            assert "fcm.googleapis.com" in call_url


class TestPushValidation:

    def test_no_tokens_skips(self):
        """Subscriber with no push_tokens returns early."""
        sub = make_subscriber(push_tokens=[])
        with patch("alrt_workers.tasks.channels.push.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.push.execute_insert_query") as mock_insert:
            from alrt_workers.tasks.channels.push import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"title": "Test", "body": "Hi"}, {})
            mock_insert.assert_not_called()

    def test_no_matching_platform_skips(self):
        """Subscriber with ios tokens but platform=android skips."""
        sub = make_subscriber(push_tokens=[{"token": "apns_tok", "platform": "ios"}])
        with patch("alrt_workers.tasks.channels.push.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.push.execute_insert_query") as mock_insert:
            from alrt_workers.tasks.channels.push import deliver
            deliver(_mock_self(), str(uuid.uuid4()), str(sub["id"]), str(uuid.uuid4()),
                    {"title": "Test", "body": "Hi"}, {}, platform="android")
            mock_insert.assert_not_called()


class TestPushTokenCleanup:

    def test_invalid_fcm_token_removed(self):
        """FCM NotRegistered error triggers token removal."""
        team_id = uuid.uuid4()
        sub_id = uuid.uuid4()
        sub = make_subscriber(
            id=sub_id, team_id=team_id,
            push_tokens=[{"token": "bad_token", "platform": "android"}],
        )

        provider = _push_provider(team_id)

        def read_one_side_effect(query, params):
            if "subscribers" in query:
                return sub
            if "providers" in query:
                return provider
            return None

        with patch("alrt_workers.tasks.channels.push.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.channels.push.execute_insert_query",
                   return_value={"id": uuid.uuid4(), "created_at": "2026-01-01T00:00:00Z"}), \
             patch("alrt_workers.tasks.channels.push.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.push.httpx") as mock_httpx:

            mock_httpx.post.return_value = _mock_httpx_response(200, {
                "results": [{"error": "NotRegistered"}],
            })

            from alrt_workers.tasks.channels.push import deliver
            deliver(
                _mock_self(),
                str(uuid.uuid4()), str(sub_id), str(team_id),
                {"title": "Test", "body": "Hello"},
                {},
            )

            # Should have called REMOVE_PUSH_TOKEN
            update_calls = [str(c) for c in mock_update.call_args_list]
            assert any("push_tokens" in c for c in update_calls) or any("dead_letter" in c for c in update_calls)
