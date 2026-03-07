"""Flow tests: delay node creates scheduled_step, email does NOT fire yet."""
import uuid
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_workflow, make_subscriber, make_execution


def _mock_task_self():
    mock = MagicMock()
    mock.request.retries = 0
    mock.max_retries = 3
    return mock


class TestDelayAndSchedule:

    def test_delay_node_creates_scheduled_step(self):
        """Trigger -> delay -> email: delay creates scheduled_step, email does NOT fire."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id, email="user@test.com")
        workflow = make_workflow(
            team_id=team_id,
            definition={
                "nodes": [
                    {"id": "trigger-1", "type": "trigger", "data": {}},
                    {"id": "delay-1", "type": "delay", "data": {"duration_seconds": 3600}},
                    {"id": "email-1", "type": "channel", "data": {
                        "channel": "email",
                        "template": {"subject": "Delayed", "body": "Hello after delay"},
                    }},
                ],
                "edges": [
                    {"source": "trigger-1", "target": "delay-1"},
                    {"source": "delay-1", "target": "email-1"},
                ],
            },
        )
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
            event_payload={"action": "signup"},
        )

        def wf_read_one_side_effect(query, params):
            if "workflow_executions" in query:
                return execution
            if "workflows" in query:
                return workflow
            if "subscribers" in query:
                return subscriber
            return None

        with patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=wf_read_one_side_effect), \
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True) as wf_update, \
             patch("alrt_workers.tasks.step_runner.execute_insert_query", return_value={"id": uuid.uuid4()}) as sr_insert, \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email_deliver:

            mock_email_deliver.delay = MagicMock()

            from alrt_workers.tasks.workflow import execute
            execute(_mock_task_self(), str(execution["id"]))

            # Scheduled step created (delay node inserts into scheduled_steps)
            sr_insert.assert_called_once()
            insert_args = sr_insert.call_args[0]
            assert "scheduled_steps" in insert_args[0]

            # Email should NOT fire (delay pauses the branch)
            mock_email_deliver.delay.assert_not_called()

            # Execution NOT marked completed (paused branch)
            for call_item in wf_update.call_args_list:
                status_arg = call_item[0][1]
                assert "completed" not in status_arg
