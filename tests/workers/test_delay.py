"""Tests for alrt_workers.tasks.delay.poll_scheduled_steps."""
import uuid
from unittest.mock import patch
from datetime import datetime, timezone

import pytest

# Pre-import so patch targets are resolvable
import alrt_workers.tasks.delay  # noqa: F401
import alrt_workers.tasks.step_runner  # noqa: F401


class TestPollScheduledSteps:

    def test_processes_due_steps(self):
        """One due step -> execute_step called, step marked completed."""
        step_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        due_step = {
            "id": step_id,
            "workflow_execution_id": exec_id,
            "next_step_id": "email-1",
            "payload": {"key": "value"},
            "scheduled_at": datetime.now(timezone.utc),
            "status": "pending",
        }

        with patch("alrt_workers.tasks.delay.execute_read_query") as mock_read, \
             patch("alrt_workers.tasks.delay.execute_read_one_query", return_value=None), \
             patch("alrt_workers.tasks.delay.execute_update_query") as mock_update, \
             patch("alrt_workers.tasks.step_runner.execute_step") as mock_step:
            # First read_query: due scheduled_steps, second: due executions (empty)
            mock_read.side_effect = [[due_step], []]

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            # execute_step called with resumed node
            mock_step.assert_called_once()
            args = mock_step.call_args[0]
            assert args[0] == str(exec_id)
            assert args[1] == {"id": "email-1", "type": "resume"}

            # Step marked processing then completed (2 update calls)
            assert mock_update.call_count == 2
            first_update = mock_update.call_args_list[0][0]
            assert first_update[1] == [step_id, "processing"]
            second_update = mock_update.call_args_list[1][0]
            assert second_update[1] == [step_id, "completed"]

    def test_no_due_steps(self):
        """Empty list -> nothing happens."""
        with patch("alrt_workers.tasks.delay.execute_read_query", return_value=[]) as mock_read, \
             patch("alrt_workers.tasks.delay.execute_update_query") as mock_update, \
             patch("alrt_workers.tasks.step_runner.execute_step") as mock_step:

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            mock_step.assert_not_called()
            mock_update.assert_not_called()
