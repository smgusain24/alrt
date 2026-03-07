"""Flow tests: condition node branching — true/false paths."""
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

class TestConditionBranching:

    def test_true_branch_fires(self):
        """Payload matches condition (equals) -> children fire."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id, email="user@test.com")
        workflow = make_workflow(
            team_id=team_id,
            definition={
                "nodes": [
                    {"id": "trigger-1", "type": "trigger", "data": {}},
                    {"id": "cond-1", "type": "condition", "data": {
                        "field": "plan",
                        "operator": "equals",
                        "value": "pro",
                    }},
                    {"id": "email-1", "type": "channel", "data": {
                        "channel": "email",
                        "template": {"subject": "Welcome Pro", "body": "You are Pro!"},
                    }},
                ],
                "edges": [
                    {"source": "trigger-1", "target": "cond-1"},
                    {"source": "cond-1", "target": "email-1"},
                ],
            },
        )
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
            event_payload={"plan": "pro"},  # matches condition
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
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email_deliver:

            mock_email_deliver.delay = MagicMock()

            from alrt_workers.tasks.workflow import execute
            execute(_mock_task_self(), str(execution["id"]))

            # Condition matched -> email.deliver.delay called
            mock_email_deliver.delay.assert_called_once()

    def test_false_branch_skips(self):
        """Payload does NOT match condition -> children do NOT fire."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id, email="user@test.com")
        workflow = make_workflow(
            team_id=team_id,
            definition={
                "nodes": [
                    {"id": "trigger-1", "type": "trigger", "data": {}},
                    {"id": "cond-1", "type": "condition", "data": {
                        "field": "plan",
                        "operator": "equals",
                        "value": "pro",
                    }},
                    {"id": "email-1", "type": "channel", "data": {
                        "channel": "email",
                        "template": {"subject": "Welcome Pro", "body": "You are Pro!"},
                    }},
                ],
                "edges": [
                    {"source": "trigger-1", "target": "cond-1"},
                    {"source": "cond-1", "target": "email-1"},
                ],
            },
        )
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
            event_payload={"plan": "free"},  # does NOT match condition
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
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email_deliver:

            mock_email_deliver.delay = MagicMock()

            from alrt_workers.tasks.workflow import execute
            execute(_mock_task_self(), str(execution["id"]))

            # Condition not matched -> email.deliver.delay NOT called
            mock_email_deliver.delay.assert_not_called()
