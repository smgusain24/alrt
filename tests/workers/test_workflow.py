"""Tests for alrt_workers.tasks.workflow.execute — the BFS workflow executor."""
import uuid
from unittest.mock import patch, MagicMock, call

import pytest

from tests.fixtures.data import make_execution, make_workflow, make_subscriber

# Pre-import so patch targets are resolvable
import alrt_workers.tasks.workflow  # noqa: F401
import alrt_workers.tasks.step_runner  # noqa: F401


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _linear_workflow(team_id):
    """Trigger -> email (linear)."""
    return make_workflow(
        team_id=team_id,
        definition={
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {}},
                {"id": "email-1", "type": "channel", "data": {"channel": "email", "template": {"title": "Hi", "body": "Hello"}}},
            ],
            "edges": [
                {"source": "trigger-1", "target": "email-1"},
            ],
        },
    )


def _branching_workflow(team_id):
    """Trigger -> [email, slack] (parallel branches)."""
    return make_workflow(
        team_id=team_id,
        definition={
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {}},
                {"id": "email-1", "type": "channel", "data": {"channel": "email", "template": {"title": "Hi", "body": "Hello"}}},
                {"id": "slack-1", "type": "channel", "data": {"channel": "slack", "template": {"text": "Hello"}}},
            ],
            "edges": [
                {"source": "trigger-1", "target": "email-1"},
                {"source": "trigger-1", "target": "slack-1"},
            ],
        },
    )


def _diamond_workflow(team_id):
    """Trigger -> [A, B] -> C  (diamond — C should only execute once)."""
    return make_workflow(
        team_id=team_id,
        definition={
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {}},
                {"id": "email-a", "type": "channel", "data": {"channel": "email", "template": {"title": "A", "body": "A"}}},
                {"id": "email-b", "type": "channel", "data": {"channel": "email", "template": {"title": "B", "body": "B"}}},
                {"id": "email-c", "type": "channel", "data": {"channel": "email", "template": {"title": "C", "body": "C"}}},
            ],
            "edges": [
                {"source": "trigger-1", "target": "email-a"},
                {"source": "trigger-1", "target": "email-b"},
                {"source": "email-a", "target": "email-c"},
                {"source": "email-b", "target": "email-c"},
            ],
        },
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestWorkflowExecute:

    def test_linear_execution(self):
        """Trigger -> email -> execution marked completed."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id)
        workflow = _linear_workflow(team_id)
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
        )

        def read_one_side_effect(query, params):
            if "workflow_executions" in query:
                return execution
            if "workflows" in query:
                return workflow
            if "subscribers" in query:
                return subscriber
            return None

        with patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.workflow.execute_update_query") as mock_update, \
             patch("alrt_workers.tasks.step_runner.execute_step", return_value="ok") as mock_step:

            from alrt_workers.tasks.workflow import execute
            execute(MagicMock(), str(execution["id"]))

            # execute_step called once for the email node
            assert mock_step.call_count == 1
            node_arg = mock_step.call_args[0][1]
            assert node_arg["id"] == "email-1"

            # Execution marked completed
            mock_update.assert_called_once()
            args = mock_update.call_args[0]
            assert args[1] == [execution["id"], "completed"]

    def test_branching_execution(self):
        """Trigger -> [email, slack] -> both steps called."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id)
        workflow = _branching_workflow(team_id)
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
        )

        def read_one_side_effect(query, params):
            if "workflow_executions" in query:
                return execution
            if "workflows" in query:
                return workflow
            if "subscribers" in query:
                return subscriber
            return None

        with patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.workflow.execute_update_query") as mock_update, \
             patch("alrt_workers.tasks.step_runner.execute_step", return_value="ok") as mock_step:

            from alrt_workers.tasks.workflow import execute
            execute(MagicMock(), str(execution["id"]))

            # Both channel steps called
            assert mock_step.call_count == 2
            called_node_ids = {c[0][1]["id"] for c in mock_step.call_args_list}
            assert called_node_ids == {"email-1", "slack-1"}

            # Execution marked completed
            mock_update.assert_called_once()

    def test_diamond_no_double_execute(self):
        """Trigger -> [A, B] -> C : C should be executed exactly once."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id)
        workflow = _diamond_workflow(team_id)
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
        )

        def read_one_side_effect(query, params):
            if "workflow_executions" in query:
                return execution
            if "workflows" in query:
                return workflow
            if "subscribers" in query:
                return subscriber
            return None

        with patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.workflow.execute_update_query") as mock_update, \
             patch("alrt_workers.tasks.step_runner.execute_step", return_value="ok") as mock_step:

            from alrt_workers.tasks.workflow import execute
            execute(MagicMock(), str(execution["id"]))

            # A, B, C each called exactly once (3 total, not 4)
            assert mock_step.call_count == 3
            called_node_ids = [c[0][1]["id"] for c in mock_step.call_args_list]
            assert called_node_ids.count("email-c") == 1

            # Execution marked completed
            mock_update.assert_called_once()

    def test_missing_workflow_marks_failed(self):
        """When the workflow row is missing, execution should be marked failed."""
        team_id = uuid.uuid4()
        execution = make_execution(team_id=team_id)

        call_count = [0]

        def read_one_side_effect(query, params):
            call_count[0] += 1
            if "workflow_executions" in query:
                return execution
            # workflow and subscriber return None
            return None

        with patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=read_one_side_effect), \
             patch("alrt_workers.tasks.workflow.execute_update_query") as mock_update, \
             patch("alrt_workers.tasks.step_runner.execute_step") as mock_step:

            from alrt_workers.tasks.workflow import execute
            execute(MagicMock(), str(execution["id"]))

            # execute_step never called
            mock_step.assert_not_called()

            # Execution marked failed
            mock_update.assert_called_once()
            args = mock_update.call_args[0]
            assert args[1] == [execution["id"], "failed"]
