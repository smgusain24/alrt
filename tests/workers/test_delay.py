"""Tests for alrt_workers.tasks.delay.poll_scheduled_steps.

Regression guard: resuming a due delay step must actually deliver the post-delay
node. This path was previously a no-op (the poller sent a `type:"resume"` node
that the router ignored), so trigger -> delay -> email delivered nothing.
"""
import uuid
from unittest.mock import patch, MagicMock

from tests.fixtures.data import make_workflow, make_subscriber, make_execution

# Pre-import so patch targets resolve
import alrt_workers.tasks.delay  # noqa: F401
import alrt_workers.tasks.workflow  # noqa: F401


def _delay_workflow(team_id):
    """trigger -> delay -> email."""
    return make_workflow(
        team_id=team_id,
        definition={
            "nodes": [
                {"id": "trigger-1", "type": "trigger", "data": {}},
                {"id": "delay-1", "type": "delay", "data": {"duration_seconds": 3600}},
                {"id": "email-1", "type": "channel", "data": {
                    "channel": "email",
                    "template": {"subject": "After delay", "body": "Hello"},
                }},
            ],
            "edges": [
                {"source": "trigger-1", "target": "delay-1"},
                {"source": "delay-1", "target": "email-1"},
            ],
        },
    )


class TestPollScheduledSteps:

    def test_resume_delivers_post_delay_step(self):
        """A due delay step -> poller resumes -> email fires and execution completes."""
        team_id = uuid.uuid4()
        subscriber = make_subscriber(team_id=team_id, email="user@test.com")
        workflow = _delay_workflow(team_id)
        execution = make_execution(
            team_id=team_id,
            workflow_id=workflow["id"],
            subscriber_id=subscriber["id"],
            event_payload={"action": "signup"},
        )
        step_id = uuid.uuid4()
        due_step = {
            "id": step_id,
            "workflow_execution_id": execution["id"],
            "next_step_id": "delay-1",
        }

        def wf_read_one(query, params):
            if "scheduled_steps" in query:
                return None  # no open steps remain -> execution completes
            if "workflow_executions" in query:
                return execution
            if "workflows" in query:
                return workflow
            if "subscribers" in query:
                return subscriber
            return None

        with patch("alrt_workers.tasks.delay.execute_read_query", side_effect=[[due_step], []]), \
             patch("alrt_workers.tasks.delay.execute_update_query", return_value=True) as delay_update, \
             patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=wf_read_one), \
             patch("alrt_workers.tasks.workflow.execute_insert_query", return_value={"id": uuid.uuid4()}), \
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True) as wf_update, \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email:

            mock_email.delay = MagicMock()

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            # The fix: the post-delay email actually fires on resume.
            mock_email.delay.assert_called_once()
            assert mock_email.delay.call_args[0][0] == str(execution["id"])
            assert mock_email.delay.call_args[0][1] == str(subscriber["id"])

            # Scheduled step marked completed.
            assert any(c[0][1] == [step_id, "completed"] for c in delay_update.call_args_list)

            # Execution marked completed once the branch finished.
            assert any(c[0][1] == [execution["id"], "completed"] for c in wf_update.call_args_list)

    def test_no_due_steps(self):
        """No due steps and no due executions -> nothing dispatched."""
        with patch("alrt_workers.tasks.delay.execute_read_query", side_effect=[[], []]), \
             patch("alrt_workers.tasks.delay.execute_update_query") as delay_update, \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email:

            mock_email.delay = MagicMock()

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            mock_email.delay.assert_not_called()
            delay_update.assert_not_called()
