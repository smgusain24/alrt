"""Tests for /templates endpoints."""
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID
from tests.fixtures.data import make_subscriber


@pytest.mark.asyncio
class TestPreviewTemplate:
    async def test_preview_with_variables(self, client):
        with patch("alrt.routes.templates.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = None  # No subscriber lookup

            resp = await client.post("/templates/preview", json={
                "template": "Hello {{payload.name}}, welcome!",
                "payload": {"name": "Alice"},
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            data = resp.json()
            assert "Alice" in data["rendered"]

    async def test_preview_with_subscriber(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1", name="Bob")
        with patch("alrt.routes.templates.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = sub

            resp = await client.post("/templates/preview", json={
                "template": "Hi {{subscriber.name}}",
                "payload": {},
                "subscriber_id": "user-1",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
