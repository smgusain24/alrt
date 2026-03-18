"""Tests for /subscribers endpoints."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID
from tests.fixtures.data import make_subscriber


@pytest.mark.asyncio
class TestCreateSubscriber:
    async def test_create_success(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="new-user")
        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.subscribers.execute_insert_query", new_callable=AsyncMock) as mock_insert:
            mock_read.return_value = None  # No existing
            mock_insert.return_value = sub

            resp = await client.post("/subscribers", json={
                "external_id": "new-user",
                "email": "user@test.com",
                "name": "Test User",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 201
            assert resp.json()["external_id"] == "new-user"

    async def test_create_duplicate(self, client):
        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = make_subscriber()

            resp = await client.post("/subscribers", json={
                "external_id": "existing",
                "email": "e@test.com",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 409


@pytest.mark.asyncio
class TestListSubscribers:
    async def test_list_with_pagination(self, client):
        subs = [make_subscriber(external_id=f"u{i}") for i in range(3)]
        with patch("alrt.routes.subscribers.execute_read_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_count:
            mock_read.return_value = subs
            mock_count.return_value = {"total": 3}

            resp = await client.get("/subscribers?limit=10&offset=0", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            data = resp.json()
            assert data["total"] == 3
            assert len(data["data"]) == 3


@pytest.mark.asyncio
class TestGetSubscriber:
    async def test_get_by_external_id(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1")
        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = sub

            resp = await client.get("/subscribers/user-1", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            assert resp.json()["external_id"] == "user-1"

    async def test_get_not_found(self, client):
        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = None

            resp = await client.get("/subscribers/nonexistent", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404


@pytest.mark.asyncio
class TestUpdateSubscriber:
    async def test_update_email(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1")
        updated = {**sub, "email": "new@test.com"}

        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.subscribers.execute_insert_query", new_callable=AsyncMock) as mock_insert:
            mock_read.return_value = sub
            mock_insert.return_value = updated

            resp = await client.patch("/subscribers/user-1", json={
                "email": "new@test.com",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            assert resp.json()["email"] == "new@test.com"


@pytest.mark.asyncio
class TestDeleteSubscriber:
    async def test_soft_delete(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1")
        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.subscribers.execute_update_query", new_callable=AsyncMock) as mock_update:
            mock_read.return_value = sub
            mock_update.return_value = True

            resp = await client.delete("/subscribers/user-1", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 204


@pytest.mark.asyncio
class TestPreferences:
    async def test_get_preferences(self, client):
        sub = make_subscriber(
            team_id=TEAM_ID,
            external_id="user-1",
            channel_preferences={
                "global": {"email": True, "in_app": False},
                "dnd": {"start": "22:00", "end": "08:00", "timezone": "UTC"},
            },
        )
        with patch("alrt.routes.subscribers.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = sub

            resp = await client.get("/subscribers/user-1/preferences", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            data = resp.json()
            # PreferencesResponse is flat (no channel_preferences wrapper)
            prefs = data.get("global") or data.get("global_", {})
            assert prefs["email"] is True
            assert prefs["in_app"] is False
