"""Flow tests: trigger API -> workflow execute -> step_runner -> channel delivery."""
import uuid
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_workflow, make_subscriber, make_execution


def _mock_task_self():
    mock = MagicMock()
    mock.request.retries = 0
    mock.max_retries = 3
    return mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestTriggerToDelivery:

    def test_happy_path_email_delivery(self):
        """Workflow with trigger -> email: email.deliver.delay() called with correct args."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id, email="user@test.com")
        workflow = make_workflow(
            team_id=team_id,
            definition={
                "nodes": [
                    {"id": "trigger-1", "type": "trigger", "data": {}},
                    {"id": "email-1", "type": "channel", "data": {
                        "channel": "email",
                        "template": {"subject": "Hi {{subscriber.name}}", "body": "Hello"},
                    }},
                ],
                "edges": [
                    {"source": "trigger-1", "target": "email-1"},
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
             patch("alrt_workers.tasks.workflow.execute_insert_query", return_value={"id": uuid.uuid4()}), \
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True) as wf_update, \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email_deliver:

            mock_email_deliver.delay = MagicMock()

            from alrt_workers.tasks.workflow import execute
            execute(_mock_task_self(), str(execution["id"]))

            # email.deliver.delay called exactly once
            mock_email_deliver.delay.assert_called_once()
            call_args = mock_email_deliver.delay.call_args

            # Verify positional args: (execution_id, subscriber_id, team_id, template_data, payload)
            assert call_args[0][0] == str(execution["id"])
            assert call_args[0][1] == str(subscriber["id"])
            assert call_args[0][2] == str(team_id)

            # Execution marked completed (ledger also records per-step status)
            assert any(c[0][1] == [execution["id"], "completed"] for c in wf_update.call_args_list)

    def test_opted_out_channel_skipped(self):
        """Subscriber with email opt-out -> email.deliver.delay NOT called."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(
            team_id=team_id,
            email="user@test.com",
            channel_preferences={"global": {"email": False}},
        )
        workflow = make_workflow(
            team_id=team_id,
            definition={
                "nodes": [
                    {"id": "trigger-1", "type": "trigger", "data": {}},
                    {"id": "email-1", "type": "channel", "data": {
                        "channel": "email",
                        "template": {"subject": "Hi", "body": "Hello"},
                    }},
                ],
                "edges": [
                    {"source": "trigger-1", "target": "email-1"},
                ],
            },
        )
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
            event_payload={},
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
             patch("alrt_workers.tasks.workflow.execute_insert_query", return_value={"id": uuid.uuid4()}), \
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email_deliver:

            mock_email_deliver.delay = MagicMock()

            from alrt_workers.tasks.workflow import execute
            execute(_mock_task_self(), str(execution["id"]))

            # email.deliver.delay should NOT be called (subscriber opted out)
            mock_email_deliver.delay.assert_not_called()
