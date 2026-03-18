"""Tests for async client."""
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from alrt_sdk import AsyncAlrt
from tests.conftest import mock_response


@pytest.mark.asyncio
async def test_async_trigger():
    with patch("alrt_sdk.client.httpx.AsyncClient") as MockClient:
        client_instance = MagicMock()
        client_instance.request = AsyncMock(return_value=mock_response(202, {
            "event_id": "abc", "status": "accepted", "warnings": [],
        }))
        client_instance.aclose = AsyncMock()
        MockClient.return_value = client_instance

        async with AsyncAlrt(api_key="alrt_sk_test") as alrt:
            result = await alrt.events.trigger(workflow="test", subscriber_id="u1")
            assert result.status == "accepted"


@pytest.mark.asyncio
async def test_async_get_subscriber():
    with patch("alrt_sdk.client.httpx.AsyncClient") as MockClient:
        client_instance = MagicMock()
        client_instance.request = AsyncMock(return_value=mock_response(200, {
            "id": "uuid-1", "external_id": "user-1", "email": "a@b.com",
            "push_tokens": [], "custom_properties": {}, "channel_preferences": {},
            "created_at": "2026-01-01", "updated_at": "2026-01-01",
        }))
        client_instance.aclose = AsyncMock()
        MockClient.return_value = client_instance

        async with AsyncAlrt(api_key="alrt_sk_test") as alrt:
            sub = await alrt.subscribers.get("user-1")
            assert sub.external_id == "user-1"


@pytest.mark.asyncio
async def test_async_retries_on_429():
    with patch("alrt_sdk.client.httpx.AsyncClient") as MockClient, \
         patch("alrt_sdk.retry.async_sleep", new_callable=AsyncMock):
        client_instance = MagicMock()
        client_instance.request = AsyncMock(side_effect=[
            mock_response(429, text='{"detail":"Rate limited"}', headers={"retry-after": "0"}),
            mock_response(200, {"event_id": "ok", "status": "accepted", "warnings": []}),
        ])
        client_instance.aclose = AsyncMock()
        MockClient.return_value = client_instance

        async with AsyncAlrt(api_key="alrt_sk_test", max_retries=3) as alrt:
            result = await alrt.events.trigger(workflow="test", subscriber_id="u1")
            assert result.status == "accepted"
            assert client_instance.request.call_count == 2
