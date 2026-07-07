"""Tests for alrt_workers.tasks.reconcile.reconcile_orphaned_executions.

The reconciler heals the trigger's commit-then-enqueue gap and recovers scheduled steps
left stuck by a crashed resume task. Each `execute_read_query` call is one phase, in
order: reset stuck 'processing' steps, then claim orphaned 'running' executions to
re-drive. It deliberately does NOT reap 'running' ledger rows (deleting them would
remove the maybe_complete guard and double-send / false-complete a crashed node).
"""
import uuid
from unittest.mock import patch

import alrt_workers.tasks.reconcile  # noqa: F401 — pre-import so patch targets resolve


class TestReconcile:

    def test_reenqueues_orphaned_execution(self):
        """A stale 'running' execution with nothing scheduled gets re-enqueued once."""
        exec_id = uuid.uuid4()
        reads = [
            [],                    # reset stuck 'processing' scheduled steps
            [{"id": exec_id}],     # claim-orphans returns the orphan
        ]
        with patch("alrt_workers.tasks.reconcile.execute_read_query", side_effect=reads), \
             patch("alrt_workers.tasks.reconcile._enqueue_workflow_task") as mock_enqueue:
            from alrt_workers.tasks.reconcile import reconcile_orphaned_executions
            summary = reconcile_orphaned_executions()

        mock_enqueue.assert_called_once_with(str(exec_id))
        assert summary["reenqueued"] == 1

    def test_resets_stuck_processing_steps(self):
        """Stuck 'processing' scheduled steps are reset without re-enqueuing anything."""
        reads = [
            [{"id": uuid.uuid4()}, {"id": uuid.uuid4()}],  # reset 2 steps
            [],                                            # no orphans
        ]
        with patch("alrt_workers.tasks.reconcile.execute_read_query", side_effect=reads), \
             patch("alrt_workers.tasks.reconcile._enqueue_workflow_task") as mock_enqueue:
            from alrt_workers.tasks.reconcile import reconcile_orphaned_executions
            summary = reconcile_orphaned_executions()

        assert summary["reset_steps"] == 2
        mock_enqueue.assert_not_called()

    def test_nothing_stale_is_noop(self):
        """No stale rows -> no re-enqueue, all-zero summary."""
        with patch("alrt_workers.tasks.reconcile.execute_read_query", side_effect=[[], []]), \
             patch("alrt_workers.tasks.reconcile._enqueue_workflow_task") as mock_enqueue:
            from alrt_workers.tasks.reconcile import reconcile_orphaned_executions
            summary = reconcile_orphaned_executions()

        mock_enqueue.assert_not_called()
        assert summary == {"reset_steps": 0, "reenqueued": 0}
