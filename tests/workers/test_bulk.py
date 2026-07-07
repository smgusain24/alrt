"""Tests for alrt_workers.tasks.bulk.process_bulk_batch.

Guards the async bulk fan-out: derived idempotency keys make redelivery a no-op, and
'scheduled' executions are left for the poller rather than enqueued immediately.
"""
import uuid
from unittest.mock import patch

import alrt_workers.tasks.bulk  # noqa: F401 — pre-import so patch targets resolve


class TestProcessBulkBatch:

    def test_creates_and_enqueues_new_executions(self):
        """A fresh batch: each subscriber is upserted, an execution is created with a
        derived idempotency key, and delivery is enqueued."""
        batch_id = str(uuid.uuid4())
        sub_row = {"id": uuid.uuid4()}
        exec_row = {"id": uuid.uuid4()}

        with patch("alrt_workers.tasks.bulk.execute_insert_query", side_effect=[sub_row, exec_row]) as mock_insert, \
             patch("alrt_workers.tasks.bulk.execute_update_query"), \
             patch("alrt_workers.tasks.bulk._enqueue_workflow_task") as mock_enqueue:

            from alrt_workers.tasks.bulk import process_bulk_batch
            summary = process_bulk_batch(
                batch_id, str(uuid.uuid4()), str(uuid.uuid4()),
                {}, None, {}, None, {}, [{"id": "user-1"}], "running",
            )

        mock_enqueue.assert_called_once_with(str(exec_row["id"]))
        assert summary["accepted"] == 1
        assert summary["errors"] == 0
        # Execution insert ($8 / index 7) carries the derived per-subscriber key.
        exec_params = mock_insert.call_args_list[1][0][1]
        assert exec_params[7] == f"bulk:{batch_id}:user-1"

    def test_conflict_does_not_reenqueue(self):
        """Redelivered batch: the execution already exists (ON CONFLICT DO NOTHING
        returns None), so it must NOT be enqueued a second time."""
        batch_id = str(uuid.uuid4())
        sub_row = {"id": uuid.uuid4()}

        with patch("alrt_workers.tasks.bulk.execute_insert_query", side_effect=[sub_row, None]), \
             patch("alrt_workers.tasks.bulk.execute_update_query"), \
             patch("alrt_workers.tasks.bulk._enqueue_workflow_task") as mock_enqueue:

            from alrt_workers.tasks.bulk import process_bulk_batch
            summary = process_bulk_batch(
                batch_id, str(uuid.uuid4()), str(uuid.uuid4()),
                {}, None, {}, None, {}, [{"id": "user-1"}], "running",
            )

        mock_enqueue.assert_not_called()
        assert summary["accepted"] == 1  # already-created counts as accepted, no dup send

    def test_scheduled_status_is_not_enqueued(self):
        """A 'scheduled' batch creates executions but leaves enqueue to the deliver_at
        poller."""
        sub_row = {"id": uuid.uuid4()}
        exec_row = {"id": uuid.uuid4()}

        with patch("alrt_workers.tasks.bulk.execute_insert_query", side_effect=[sub_row, exec_row]), \
             patch("alrt_workers.tasks.bulk.execute_update_query"), \
             patch("alrt_workers.tasks.bulk._enqueue_workflow_task") as mock_enqueue:

            from alrt_workers.tasks.bulk import process_bulk_batch
            process_bulk_batch(
                str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()),
                {}, None, {}, "2099-01-01T00:00:00+00:00", {}, [{"id": "user-1"}], "scheduled",
            )

        mock_enqueue.assert_not_called()

    def test_subscriber_upsert_failure_counts_error(self):
        """If the subscriber upsert returns nothing, count it as an error and skip."""
        with patch("alrt_workers.tasks.bulk.execute_insert_query", side_effect=[None]), \
             patch("alrt_workers.tasks.bulk.execute_update_query"), \
             patch("alrt_workers.tasks.bulk._enqueue_workflow_task") as mock_enqueue:

            from alrt_workers.tasks.bulk import process_bulk_batch
            summary = process_bulk_batch(
                str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4()),
                {}, None, {}, None, {}, [{"id": "user-1"}], "running",
            )

        mock_enqueue.assert_not_called()
        assert summary["errors"] == 1
        assert summary["accepted"] == 0
