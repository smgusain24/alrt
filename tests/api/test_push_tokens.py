"""Push token API tests — register, remove, list push tokens."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID
from tests.fixtures.data import make_subscriber


@pytest.mark.asyncio
async def test_register_push_token(client):
    """POST /subscribers/:id/push-tokens registers a new token."""
    sub = make_subscriber(external_id="user-1", push_tokens=[])

    with patch("alrt.routes.push_tokens.execute_read_one_query", new_callable=AsyncMock) as mock_read:
        mock_read.side_effect = [
            sub,  # FIND_BY_EXTERNAL_ID
            {"push_tokens": [{"token": "fcm_tok", "platform": "android", "device_id": "dev1", "last_seen": "2026-03-17T00:00:00Z"}]},  # ADD_PUSH_TOKEN
        ]

        resp = await client.post("/subscribers/user-1/push-tokens", json={
            "token": "fcm_tok",
            "platform": "android",
            "device_id": "dev1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["token"] == "fcm_tok"
        assert data[0]["platform"] == "android"


@pytest.mark.asyncio
async def test_register_invalid_platform_rejects(client):
    """Invalid platform returns 400."""
    sub = make_subscriber(external_id="user-1")

    with patch("alrt.routes.push_tokens.execute_read_one_query", new_callable=AsyncMock, return_value=sub):
        resp = await client.post("/subscribers/user-1/push-tokens", json={
            "token": "tok",
            "platform": "blackberry",
        })
        assert resp.status_code == 400
        assert "platform" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_remove_push_token(client):
    """DELETE /subscribers/:id/push-tokens/:token removes the token."""
    sub = make_subscriber(external_id="user-1", push_tokens=[
        {"token": "fcm_tok", "platform": "android"},
    ])

    with patch("alrt.routes.push_tokens.execute_read_one_query", new_callable=AsyncMock) as mock_read:
        mock_read.side_effect = [
            sub,  # FIND_BY_EXTERNAL_ID
            {"push_tokens": []},  # REMOVE_PUSH_TOKEN result
        ]

        resp = await client.delete("/subscribers/user-1/push-tokens/fcm_tok")
        assert resp.status_code == 200
        assert resp.json() == []


@pytest.mark.asyncio
async def test_list_push_tokens(client):
    """GET /subscribers/:id/push-tokens returns token list."""
    sub = make_subscriber(external_id="user-1")
    tokens = [
        {"token": "fcm_tok", "platform": "android", "device_id": "dev1", "last_seen": "2026-01-01"},
        {"token": "apns_tok", "platform": "ios", "device_id": None, "last_seen": None},
    ]

    with patch("alrt.routes.push_tokens.execute_read_one_query", new_callable=AsyncMock) as mock_read:
        mock_read.side_effect = [
            sub,  # FIND_BY_EXTERNAL_ID
            {"push_tokens": tokens},  # GET_PUSH_TOKENS
        ]

        resp = await client.get("/subscribers/user-1/push-tokens")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2


@pytest.mark.asyncio
async def test_subscriber_not_found_404(client):
    """Non-existent subscriber returns 404."""
    with patch("alrt.routes.push_tokens.execute_read_one_query", new_callable=AsyncMock, return_value=None):
        resp = await client.post("/subscribers/nonexistent/push-tokens", json={
            "token": "tok",
            "platform": "android",
        })
        assert resp.status_code == 404
