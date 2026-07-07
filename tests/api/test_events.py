"""Tests for /events endpoints (trigger)."""
import uuid
from datetime import datetime, timezone
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
             patch("alrt.routes.events.celery_client") as mock_cc, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            # Workflow lookup via read_one (subscriber is now upserted via insert)
            mock_read.return_value = workflow
            # First insert: subscriber upsert, second insert: execution create
            mock_insert.side_effect = [subscriber, execution]

            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock()
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger", json={
                "workflow": "test.event",
                "subscriber_id": "user-1",
                "payload": {"amount": 100},
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 202
            data = resp.json()
            assert data["status"] == "running"
            # A running execution is enqueued via the Celery producer (workflow.execute)
            mock_cc.enqueue.assert_called_once()
            assert mock_cc.enqueue.call_args[0][0] == "alrt_workers.tasks.workflow.execute"

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

    async def test_trigger_idempotency_key_from_header(self, client):
        """The Idempotency-Key HTTP header is honored even with no body field.

        Regression guard for the SDK bug where the key was sent as a header but
        the server only read the body. Asserts the header value flows through to
        the execution-create call as its idempotency_key argument ($8).
        """
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)
        subscriber = make_subscriber(id=SUBSCRIBER_ID, team_id=TEAM_ID)
        execution = make_execution(id=uuid.uuid4(), team_id=TEAM_ID, workflow_id=WORKFLOW_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow
            mock_insert.side_effect = [subscriber, execution]

            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=True)  # SET NX acquired
            mock_redis.lpush = AsyncMock()
            mock_redis.close = AsyncMock()

            resp = await client.post(
                "/events/trigger",
                json={
                    "workflow": "test.event",
                    "subscriber_id": "user-1",
                    # NOTE: no idempotency_key in the body
                },
                headers={
                    "Authorization": "Bearer fake",
                    "Idempotency-Key": "header-key-123",
                },
            )

            assert resp.status_code == 202

            # Second insert is the execution create; $8 (index 7) is idempotency_key
            exec_call = mock_insert.call_args_list[1]
            params = exec_call.args[1]
            assert params[7] == "header-key-123"

    async def test_trigger_idempotency_pending_returns_409(self, client):
        """A concurrent in-flight duplicate (Redis holds 'pending') returns 409.

        The original request has acquired the key but not yet written the real
        execution id. The server must not fabricate a UUID — it tells the client
        to retry with HTTP 409.
        """
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock), \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            # SET NX fails (key already held by the in-flight original request)
            mock_redis.set = AsyncMock(return_value=False)
            # GET returns the "pending" placeholder (no real id yet)
            mock_redis.get = AsyncMock(return_value=b"pending")
            mock_redis.close = AsyncMock()

            resp = await client.post(
                "/events/trigger",
                json={
                    "workflow": "test.event",
                    "subscriber_id": "user-1",
                    "idempotency_key": "in-flight-key",
                },
                headers={"Authorization": "Bearer fake"},
            )

            assert resp.status_code == 409

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

    async def test_request_id_echoed_and_stamped_on_execution(self, client):
        """The X-Request-Id header is echoed on the response and stored on the
        execution ($12 / index 11) so a request can be traced to its workflow run."""
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)
        subscriber = make_subscriber(id=SUBSCRIBER_ID, team_id=TEAM_ID)
        execution = make_execution(id=uuid.uuid4(), team_id=TEAM_ID, workflow_id=WORKFLOW_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow
            mock_insert.side_effect = [subscriber, execution]
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.lpush = AsyncMock()
            mock_redis.close = AsyncMock()

            resp = await client.post(
                "/events/trigger",
                json={"workflow": "test.event", "subscriber_id": "user-1"},
                headers={"Authorization": "Bearer fake", "X-Request-Id": "req-abc"},
            )

            assert resp.status_code == 202
            assert resp.headers.get("x-request-id") == "req-abc"
            exec_params = mock_insert.call_args_list[1].args[1]
            assert exec_params[11] == "req-abc"

    async def test_request_id_generated_when_absent(self, client):
        """With no client header, a correlation id is still generated and echoed."""
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.headers.get("x-request-id")  # non-empty generated id

    async def test_trigger_empty_channels_rejected(self, client):
        """Empty channels list should fail validation."""
        resp = await client.post("/events/trigger", json={
            "workflow": "test.event",
            "subscriber_id": "user-1",
            "channels": [],
        }, headers={"Authorization": "Bearer fake"})

        assert resp.status_code == 422


@pytest.mark.asyncio
class TestTriggerBulk:
    async def test_returns_202_and_fans_out_once(self, client):
        """Bulk returns 202 immediately and enqueues ONE process_bulk_batch task
        (not one enqueue per subscriber) — the whole point of the async rewrite."""
        workflow = make_workflow(id=WORKFLOW_ID, team_id=TEAM_ID)

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.celery_client") as mock_cc, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = workflow                 # FIND_PUBLISHED_BY_EVENT
            mock_insert.return_value = {"id": uuid.uuid4()}   # bulk_batches CREATE

            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger-bulk", json={
                "workflow": "test.event",
                "subscribers": [{"id": "user-1"}, {"id": "user-2"}],
                "payload": {"amount": 100},
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 202
            data = resp.json()
            assert data["status"] == "accepted"
            assert data["total"] == 2
            assert data["accepted"] == 0            # async — nothing processed in-request
            mock_insert.assert_awaited_once()       # the batch row was persisted
            assert mock_cc.enqueue.call_count == 1  # ONE fan-out task, not per-subscriber
            assert mock_cc.enqueue.call_args[0][0] == "alrt_workers.tasks.bulk.process_bulk_batch"

    async def test_duplicate_returns_existing_batch(self, client):
        """A retried batch with the same idempotency key returns the original batch id
        and does not fan out again."""
        existing_batch = {"id": uuid.uuid4()}

        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
             patch("alrt.routes.events.celery_client") as mock_cc, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = existing_batch           # FIND_BY_IDEMPOTENCY
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=False)    # NX fails -> duplicate
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger-bulk", json={
                "workflow": "test.event",
                "subscribers": [{"id": "user-1"}],
                "idempotency_key": "dup-batch",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 202
            data = resp.json()
            assert data["status"] == "duplicate"
            assert data["batch_id"] == str(existing_batch["id"])
            mock_cc.enqueue.assert_not_called()
            mock_insert.assert_not_called()

    async def test_workflow_not_found(self, client):
        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock), \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = None
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=True)
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger-bulk", json={
                "workflow": "nope",
                "subscribers": [{"id": "user-1"}],
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404

    async def test_failed_attempt_releases_idempotency_key(self, client):
        """A bulk trigger that fails before persisting (bad workflow) must release its
        idempotency placeholder so the key isn't poisoned for 24h."""
        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock), \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = None  # no published workflow -> 404
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=True)  # NX acquired -> placeholder set
            mock_redis.delete = AsyncMock()
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger-bulk", json={
                "workflow": "nope",
                "subscribers": [{"id": "user-1"}],
                "idempotency_key": "K",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 404
            mock_redis.delete.assert_awaited_once()  # placeholder released

    async def test_inflight_duplicate_returns_409(self, client):
        """A duplicate key while the original is still in flight (no batch persisted
        yet) returns 409 instead of a fabricated, un-pollable batch id."""
        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
             patch("alrt.routes.events.aioredis") as mock_redis_mod:
            mock_read.return_value = None  # FIND_BY_IDEMPOTENCY finds no batch
            mock_redis = AsyncMock()
            mock_redis_mod.from_url.return_value = mock_redis
            mock_redis.set = AsyncMock(return_value=False)  # NX fails (key held)
            mock_redis.close = AsyncMock()

            resp = await client.post("/events/trigger-bulk", json={
                "workflow": "test.event",
                "subscribers": [{"id": "user-1"}],
                "idempotency_key": "K",
            }, headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 409

    async def test_get_batch_status(self, client):
        batch_id = uuid.uuid4()
        row = {
            "id": batch_id, "team_id": TEAM_ID, "workflow_id": WORKFLOW_ID,
            "total": 100, "accepted": 60, "errors": 2, "status": "processing",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = row
            resp = await client.get(f"/events/batches/{batch_id}",
                                    headers={"Authorization": "Bearer fake"})

            assert resp.status_code == 200
            data = resp.json()
            assert data["batch_id"] == str(batch_id)
            assert data["total"] == 100
            assert data["accepted"] == 60
            assert data["status"] == "processing"

    async def test_get_batch_status_not_found(self, client):
        with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read:
            mock_read.return_value = None
            resp = await client.get(f"/events/batches/{uuid.uuid4()}",
                                    headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 404
