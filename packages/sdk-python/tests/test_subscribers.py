"""Tests for subscribers resource."""
from unittest.mock import MagicMock, patch
import pytest
from alrt_sdk import Alrt
from alrt_sdk.errors import AlrtConflictError, AlrtNotFoundError
from tests.conftest import mock_response

SUB_RESPONSE = {
    "id": "uuid-1", "external_id": "user-1", "email": "a@b.com",
    "name": "Alice", "push_tokens": [], "custom_properties": {},
    "channel_preferences": {}, "created_at": "2026-01-01", "updated_at": "2026-01-01",
}


def test_create_subscriber():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(201, SUB_RESPONSE)
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        sub = alrt.subscribers.create(external_id="user-1", email="a@b.com")
        assert sub.external_id == "user-1"


def test_create_conflict_409():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(409, text='{"detail":"Already exists"}')
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        with pytest.raises(AlrtConflictError):
            alrt.subscribers.create(external_id="user-1")


def test_get_subscriber():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(200, SUB_RESPONSE)
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        sub = alrt.subscribers.get("user-1")
        assert sub.email == "a@b.com"


def test_get_not_found_404():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(404, text='{"detail":"Not found"}')
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        with pytest.raises(AlrtNotFoundError):
            alrt.subscribers.get("nonexistent")


def test_register_push_token():
    with patch("alrt_sdk.client.httpx.Client") as MockClient:
        client_instance = MagicMock()
        client_instance.request.return_value = mock_response(200, [
            {"token": "fcm_tok", "platform": "android"},
        ])
        MockClient.return_value = client_instance

        alrt = Alrt(api_key="alrt_sk_test")
        tokens = alrt.subscribers.register_push_token("user-1", token="fcm_tok", platform="android")
        assert len(tokens) == 1
        assert tokens[0].token == "fcm_tok"
