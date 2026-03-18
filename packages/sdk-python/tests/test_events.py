"""Tests for events resource."""
from unittest.mock import MagicMock, patch
from alrt_sdk import Alrt
from tests.conftest import mock_response


def test_trigger_sends_correct_request():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(202, {
            "event_id": "abc-123", "status": "accepted", "warnings": [],
        })
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        result = alrt.events.trigger(workflow="order.completed", subscriber_id="user-1", payload={"x": 1})

        assert result.event_id == "abc-123"
        assert result.status == "accepted"
        client_instance.request.assert_called_once()
        call_args = client_instance.request.call_args
        assert call_args[0][0] == "POST"
        assert call_args[0][1] == "/events/trigger"


def test_trigger_sends_idempotency_key():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(202, {
            "event_id": "abc", "status": "accepted", "warnings": [],
        })
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        alrt.events.trigger(workflow="test", subscriber_id="u1", idempotency_key="my-key")

        call_kwargs = client_instance.request.call_args[1]
        assert call_kwargs["headers"]["Idempotency-Key"] == "my-key"


def test_trigger_bulk():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(200, {
            "batch_id": "b1", "status": "accepted", "total": 2,
            "accepted": 2, "duplicates": 0, "errors": 0,
            "results": [
                {"subscriber_id": "u1", "event_id": "e1", "status": "accepted"},
                {"subscriber_id": "u2", "event_id": "e2", "status": "accepted"},
            ],
        })
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        result = alrt.events.trigger_bulk(
            workflow="promo",
            subscribers=[{"id": "u1"}, {"id": "u2"}],
        )
        assert result.total == 2
        assert len(result.results) == 2
