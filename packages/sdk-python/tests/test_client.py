"""Tests for client retry behavior."""
from unittest.mock import MagicMock, patch, call
import pytest
from alrt_sdk import Alrt
from alrt_sdk.errors import AlrtApiError
from tests.conftest import mock_response


def test_retries_on_429_then_succeeds():
    with patch("alrt_sdk.client.httpx.Client") as MockClient, \
         patch("alrt_sdk.retry.sync_sleep"):
        client_instance = MagicMock()
        client_instance.request.side_effect = [
            mock_response(429, text='{"detail":"Rate limited"}', headers={"retry-after": "0"}),
            mock_response(429, text='{"detail":"Rate limited"}', headers={"retry-after": "0"}),
            mock_response(200, {"event_id": "ok", "status": "accepted", "warnings": []}),
        ]
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test", max_retries=3)
        result = alrt.events.trigger(workflow="test", subscriber_id="u1")
        assert result.status == "accepted"
        assert client_instance.request.call_count == 3


def test_does_not_retry_on_400():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(400, text='{"detail":"Bad request"}')
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test", max_retries=3)
        with pytest.raises(Exception):
            alrt.events.trigger(workflow="test", subscriber_id="u1")
        assert client_instance.request.call_count == 1


def test_requires_api_key():
    with pytest.raises(ValueError, match="api_key is required"):
        Alrt(api_key="")
