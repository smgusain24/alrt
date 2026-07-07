"""Tests for /teams endpoints."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID
from tests.fixtures.data import make_api_key


@pytest.mark.asyncio
class TestCreateApiKey:
    async def test_create_success(self, client):
        key = make_api_key(team_id=TEAM_ID)
        with patch("alrt.routes.teams.execute_insert_query", new_callable=AsyncMock) as mock_insert:
            mock_insert.return_value = key

            resp = await client.post(
                f"/teams/{TEAM_ID}/api-keys",
                json={"name": "My Key", "key_type": "server"},
                headers={"Authorization": "Bearer fake"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert "raw_key" in data


@pytest.mark.asyncio
class TestListApiKeys:
    async def test_list(self, client):
        keys = [make_api_key(team_id=TEAM_ID), make_api_key(team_id=TEAM_ID)]
        with patch("alrt.routes.teams.execute_read_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = keys

            resp = await client.get(
                f"/teams/{TEAM_ID}/api-keys",
                headers={"Authorization": "Bearer fake"},
            )
            assert resp.status_code == 200
            assert len(resp.json()) == 2


@pytest.mark.asyncio
class TestRevokeApiKey:
    async def test_revoke(self, client):
        key_id = uuid.uuid4()
        key = make_api_key(id=key_id, team_id=TEAM_ID)
        # The revoke path soft-deletes via execute_read_one_query(api_key_q.REVOKE,
        # ...) — an UPDATE ... RETURNING — so there is no execute_update_query
        # symbol in the module to patch. A truthy row means the key was found.
        with patch("alrt.routes.teams.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = key

            resp = await client.delete(
                f"/teams/{TEAM_ID}/api-keys/{key_id}",
                headers={"Authorization": "Bearer fake"},
            )
            assert resp.status_code == 204


