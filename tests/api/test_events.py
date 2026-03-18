"""Tests for /events endpoints (trigger)."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID, SUBSCRIBER_ID, WORKFLOW_ID
from tests.fixtures.data import make_workflow, make_subscriber, make_execution


@pytest.mark.asyncio
class TestTrigger:
    async def test_trigger_success(self, client):
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)
        subscriber = make_subscriber(id=SUBSCRIBER_ID, team_id=TEAM_ID)
        execution = make_execution(id=uuid.uuid4(), team_id=TEAM_ID, workflow_id=WORKFLOW_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            # Workflow lookup via read_one (subscriber is now upserted via insert)
            mock_read.return_value = workflow
            # First insert: subscriber upsert, second insert: execution create
            mock_insert.side_effect = [subscriber, execution]

            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock()
            mock_redis.lpush = AsyncMock()
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger", json={
                "workflow": "test.event",
                "subscriber_id": "user-1",
                "payload": {"amount": 100},
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 202
            data = resp.json()
            assert data["status"] == "running"

    async def test_trigger_workflow_not_found(self, client):
        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock), \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = None  # No workflow
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger", json={
                "workflow": "nonexistent",
                "subscriber_id": "user-1",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404

    async def test_trigger_subscriber_upsert_failure(self, client):
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow
            mock_insert.return_value = None  # Subscriber upsert fails
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger", json={
                "workflow": "test.event",
                "subscriber_id": "nonexistent",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 500

    async def test_trigger_idempotency_duplicate(self, client):
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock), \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            # Idempotency: SET NX returns None (key already exists)
            mock_redis.set = AsyncMock(return_value=None)
            existing_id = str(uuid.uuid4())
            mock_redis.get = AsyncMock(return_value=existing_id.encode())
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger", json={
                "workflow": "test.event",
                "subscriber_id": "user-1",
                "idempotency_key": "dup-key",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 202
            assert resp.json()["status"] == "duplicate"

    async def test_trigger_channel_filtering_warning(self, client):
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID, definition={
            "nodes": [
                {"id": "t", "type": "trigger", "data": {}},
                {"id": "e", "type": "channel", "data": {"channel": "email"}},
            ],
            "edges": [{"source": "t", "target": "e"}],
        })
        subscriber = make_subscriber(id=SUBSCRIBER_ID, team_id=TEAM_ID)
        execution = make_execution(id=uuid.uuid4(), team_id=TEAM_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow
            mock_insert.side_effect = [subscriber, execution]

            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock()
            mock_redis.lpush = AsyncMock()
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger", json={
                "workflow": "test.event",
                "subscriber_id": "user-1",
                "channels": ["email", "slack"],
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 202
            data = resp.json()
            # slack is not in the workflow, so should generate a warning
            assert len(data["warnings"]) > 0

    async def test_trigger_empty_channels_rejected(self, client):
        """Empty channels list should fail validation."""
        resp = await client.post("/events/trigger", json={
            "workflow": "test.event",
            "subscriber_id": "user-1",
            "channels": [],
        }, headers={"Authorization": "Bearer fake"})

        assert resp.status_code == 422
