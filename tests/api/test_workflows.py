"""Tests for /workflows endpoints."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID, WORKFLOW_ID
from tests.fixtures.data import make_workflow


@pytest.mark.asyncio
class TestCreateWorkflow:
    async def test_create_success(self, client):
        wf = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID, status="draft")
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.workflows.execute_insert_query", new_callable=AsyncMock) as mock_insert:
            mock_read.return_value = None  # No duplicate event_name
            mock_insert.return_value = wf

            resp = await client.post("/workflows", json={
                "name": "Test Workflow",
                "event_name": "test.event",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 201
            assert resp.json()["event_name"] == "test.event"

    async def test_create_duplicate_event_name(self, client):
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = make_workflow()

            resp = await client.post("/workflows", json={
                "name": "Duplicate",
                "event_name": "test.event",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 409


@pytest.mark.asyncio
class TestListWorkflows:
    async def test_list(self, client):
        wfs = [make_workflow(event_name=f"event.{i}") for i in range(2)]
        with patch("alrt.routes.workflows.execute_read_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = wfs

            resp = await client.get("/workflows", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            assert len(resp.json()) == 2


@pytest.mark.asyncio
class TestGetWorkflow:
    async def test_get_success(self, client):
        wf = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = wf

            resp = await client.get(f"/workflows/{WORKFLOW_ID}", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200

    async def test_get_not_found(self, client):
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = None

            resp = await client.get(f"/workflows/{WORKFLOW_ID}", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404


@pytest.mark.asyncio
class TestPublishWorkflow:
    async def test_publish_success(self, client):
        wf = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID, status="draft")
        published = {**wf, "status": "published"}
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.workflows.execute_insert_query", new_callable=AsyncMock) as mock_insert:
            mock_read.return_value = wf
            mock_insert.return_value = published

            resp = await client.post(f"/workflows/{WORKFLOW_ID}/publish", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            assert resp.json()["status"] == "published"

    async def test_publish_missing_trigger(self, client):
        wf = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID, definition={
            "nodes": [
                {"id": "a", "type": "channel", "data": {"channel": "email"}},
            ],
            "edges": [],
        })
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = wf

            resp = await client.post(f"/workflows/{WORKFLOW_ID}/publish", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 422
            detail = resp.json()["detail"]
            assert any("trigger" in err.lower() for err in detail)

    async def test_publish_empty_nodes(self, client):
        wf = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID, definition={
            "nodes": [],
            "edges": [],
        })
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = wf

            resp = await client.post(f"/workflows/{WORKFLOW_ID}/publish", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 422
            detail = resp.json()["detail"]
            assert any("at least one node" in err.lower() for err in detail)


@pytest.mark.asyncio
class TestDeleteWorkflow:
    async def test_delete_success(self, client):
        wf = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)
        with patch("alrt.routes.workflows.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.workflows.execute_delete_query", new_callable=AsyncMock) as mock_delete:
            mock_read.return_value = wf
            mock_delete.return_value = True

            resp = await client.delete(f"/workflows/{WORKFLOW_ID}", headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 204
