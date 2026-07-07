"""Postgres-backed integration test for delay resume + completion ordering.

The mocked unit tests stub the scheduled_steps read, so a regression that reverts the
"mark the step completed *before* maybe_complete" ordering — or drops the running-ledger
guard — would stay green. This runs the real queries against a real database, so the
execution's running -> completed transition is exercised end to end.

Skipped automatically when no Postgres is reachable (e.g. CI without a DB service).
"""
import asyncio
import os
import uuid
from unittest.mock import MagicMock, patch

import pytest

DB_URL = os.environ.get(
    "DATABASE_URL", "postgresql://alrt:alrt@localhost:5432/alrt_test"
).replace("postgresql+asyncpg://", "postgresql://")


def _db_ready():
    import asyncpg

    async def check():
        try:
            conn = await asyncio.wait_for(asyncpg.connect(DB_URL), timeout=3)
            await conn.close()
            return True
        except Exception:
            return False

    return asyncio.run(check())


pytestmark = pytest.mark.skipif(not _db_ready(), reason="Postgres not reachable")


@pytest.fixture(scope="module", autouse=True)
def _schema():
    """Ensure the full schema exists in the test DB (also validates Stream 3 DDL)."""
    from alrt.db import init_pool, ensure_schema, close_pool

    async def setup():
        await init_pool(DB_URL)
        await ensure_schema()
        await close_pool()

    asyncio.run(setup())


def _seed(team_id, workflow_id, subscriber_id, execution_id):
    from alrt_workers.db import execute_insert_query

    execute_insert_query(
        "INSERT INTO teams (id, name) VALUES ($1, $2) RETURNING id", [team_id, "itest"]
    )
    execute_insert_query(
        "INSERT INTO subscribers (id, team_id, external_id, channel_preferences) "
        "VALUES ($1, $2, $3, $4) RETURNING id",
        [subscriber_id, team_id, f"ext-{subscriber_id}", {}],
    )
    definition = {
        "nodes": [
            {"id": "trigger-1", "type": "trigger", "data": {}},
            {"id": "delay-1", "type": "delay", "data": {"duration_seconds": 1}},
        ],
        "edges": [{"source": "trigger-1", "target": "delay-1"}],
    }
    execute_insert_query(
        "INSERT INTO workflows (id, team_id, name, event_name, definition, status) "
        "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [workflow_id, team_id, "itest-wf", f"itest.{workflow_id}", definition, "published"],
    )
    execute_insert_query(
        "INSERT INTO workflow_executions "
        "(id, team_id, workflow_id, subscriber_id, event_payload, status) "
        "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        [execution_id, team_id, workflow_id, subscriber_id, {"k": "v"}, "running"],
    )


def _cleanup(team_id, workflow_id, subscriber_id, execution_id):
    from alrt_workers.db import execute_update_query

    for query, params in [
        ("DELETE FROM step_skips WHERE workflow_execution_id = $1", [execution_id]),
        ("DELETE FROM step_executions WHERE workflow_execution_id = $1", [execution_id]),
        ("DELETE FROM scheduled_steps WHERE workflow_execution_id = $1", [execution_id]),
        ("DELETE FROM notifications WHERE workflow_execution_id = $1", [execution_id]),
        ("DELETE FROM workflow_executions WHERE id = $1", [execution_id]),
        ("DELETE FROM workflows WHERE id = $1", [workflow_id]),
        ("DELETE FROM subscribers WHERE id = $1", [subscriber_id]),
        ("DELETE FROM teams WHERE id = $1", [team_id]),
    ]:
        execute_update_query(query, params)


@pytest.fixture
def worker_loop():
    """Reset the worker's psycopg3 pool around the test for a clean, isolated pool.

    (The old asyncpg sync-shim needed a pinned event loop here; psycopg3 is plain
    sync, so this just recreates the pool so the test doesn't inherit a stale one.)
    """
    import alrt_workers.db as wdb

    if wdb._pool is not None:
        wdb._pool.close()
    wdb._pool = None
    try:
        yield
    finally:
        if wdb._pool is not None:
            wdb._pool.close()
        wdb._pool = None


def test_delay_resume_completes_only_after_step_done(worker_loop):
    from alrt_workers.db import execute_read_one_query, execute_read_query
    from alrt_workers.tasks.workflow import execute
    from alrt_workers.tasks.delay import resume_scheduled_step

    team_id, workflow_id = uuid.uuid4(), uuid.uuid4()
    subscriber_id, execution_id = uuid.uuid4(), uuid.uuid4()

    _seed(team_id, workflow_id, subscriber_id, execution_id)
    try:
        # 1. Run the workflow. It walks trigger -> delay; the delay pauses (persists a
        #    pending scheduled_step), so the execution MUST stay 'running' — a
        #    downstream step is still open.
        execute(MagicMock(), str(execution_id))

        row = execute_read_one_query(
            "SELECT status FROM workflow_executions WHERE id = $1", [execution_id]
        )
        assert row["status"] == "running", "must not complete while a step is pending"
        steps = execute_read_query(
            "SELECT id, status FROM scheduled_steps WHERE workflow_execution_id = $1",
            [execution_id],
        )
        assert len(steps) == 1 and steps[0]["status"] == "pending"

        # 2. Resume the due step, exactly as the poller fans out. The delay has no
        #    children, so once the step is marked completed the execution finalizes.
        resume_scheduled_step(str(steps[0]["id"]), str(execution_id), "delay-1")

        row = execute_read_one_query(
            "SELECT status FROM workflow_executions WHERE id = $1", [execution_id]
        )
        assert row["status"] == "completed", "must complete once the last step is done"
        step = execute_read_one_query(
            "SELECT status FROM scheduled_steps WHERE id = $1", [steps[0]["id"]]
        )
        assert step["status"] == "completed"
    finally:
        _cleanup(team_id, workflow_id, subscriber_id, execution_id)


def test_reconciler_does_not_reap_or_false_complete_a_stuck_node(worker_loop):
    """Regression guard for the reconciler reap bug.

    A node that crashed *between* dispatching its channel task and recording the result
    leaves a permanently-'running' ledger row (here after a delay resumed). The
    reconciler must NOT delete that row or re-drive/false-complete the execution — the
    row is the maybe_complete guard, and reaping it would silently drop the branch and
    mark the execution completed. It must stay visibly 'running'.
    """
    from datetime import datetime, timedelta, timezone
    from alrt_workers.db import execute_insert_query, execute_read_one_query
    from alrt_workers.tasks.reconcile import reconcile_orphaned_executions

    team_id, workflow_id = uuid.uuid4(), uuid.uuid4()
    subscriber_id, execution_id = uuid.uuid4(), uuid.uuid4()
    _seed(team_id, workflow_id, subscriber_id, execution_id)

    # Simulate the crash-after-delay state: the delay's scheduled step already resumed
    # ('completed'), the delay node is 'paused', and the post-delay channel node is
    # stuck 'running' (dispatched but never recorded), all older than the 5-min window.
    old = datetime.now(timezone.utc) - timedelta(minutes=10)
    stuck_ledger_id = uuid.uuid4()
    try:
        execute_insert_query(
            "INSERT INTO scheduled_steps (id, workflow_execution_id, next_step_id, "
            "scheduled_at, status, updated_at) VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id",
            [uuid.uuid4(), execution_id, "delay-1", old, old],
        )
        execute_insert_query(
            "INSERT INTO step_executions (id, workflow_execution_id, node_id, status, updated_at) "
            "VALUES ($1, $2, 'delay-1', 'paused', $3) RETURNING id",
            [uuid.uuid4(), execution_id, old],
        )
        execute_insert_query(
            "INSERT INTO step_executions (id, workflow_execution_id, node_id, status, updated_at) "
            "VALUES ($1, $2, 'email-1', 'running', $3) RETURNING id",
            [stuck_ledger_id, execution_id, old],
        )
        # Make the execution itself stale so it would be eligible if the guard failed.
        execute_insert_query(
            "UPDATE workflow_executions SET updated_at = $2 WHERE id = $1 RETURNING id",
            [execution_id, old],
        )

        with patch("alrt_workers.tasks.reconcile._enqueue_workflow_task") as mock_enqueue:
            reconcile_orphaned_executions()

        # The execution with a stuck 'running' ledger node must NOT be re-driven...
        for call in mock_enqueue.call_args_list:
            assert call.args[0] != str(execution_id)
        # ...must stay 'running' (not false-completed)...
        row = execute_read_one_query(
            "SELECT status FROM workflow_executions WHERE id = $1", [execution_id]
        )
        assert row["status"] == "running"
        # ...and its stuck ledger row must NOT have been reaped.
        ledger = execute_read_one_query(
            "SELECT status FROM step_executions WHERE id = $1", [stuck_ledger_id]
        )
        assert ledger is not None and ledger["status"] == "running"
    finally:
        _cleanup(team_id, workflow_id, subscriber_id, execution_id)
