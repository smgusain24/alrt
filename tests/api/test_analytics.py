"""Tests for /analytics endpoints."""
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID


@pytest.mark.asyncio
class TestOverview:
    async def test_overview(self, client):
        with patch("alrt.routes.analytics.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = {"total_sent": 80, "total_failed": 5, "total_pending": 15}
            resp = await client.get("/analytics/overview", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 200


@pytest.mark.asyncio
class TestDelivery:
    async def test_delivery(self, client):
        with patch("alrt.routes.analytics.execute_read_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = [
                {"channel": "email", "sent": 45, "failed": 5, "pending": 0},
                {"channel": "in_app", "sent": 30, "failed": 0, "pending": 0},
            ]
            resp = await client.get("/analytics/delivery", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 200


@pytest.mark.asyncio
class TestWorkflows:
    async def test_workflows(self, client):
        import uuid
        with patch("alrt.routes.analytics.execute_read_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = [
                {"workflow_id": uuid.uuid4(), "workflow_name": "Test", "total_executions": 10,
                 "success_executions": 8, "failed_executions": 2, "avg_duration_s": 1.5},
            ]
            resp = await client.get("/analytics/workflows", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 200


@pytest.mark.asyncio
class TestTimeline:
    async def test_timeline(self, client):
        with patch("alrt.routes.analytics.execute_read_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = [
                {"date": date(2026, 3, 1), "sent": 10, "failed": 2},
                {"date": date(2026, 3, 2), "sent": 15, "failed": 1},
            ]
            resp = await client.get("/analytics/notifications/timeline", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 200
