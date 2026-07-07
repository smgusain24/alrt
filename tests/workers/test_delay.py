"""Tests for alrt_workers.tasks.delay — the scheduled-step poller and resume task.

Two guards:
- The poller claims due steps (SKIP LOCKED) and fans each out as its own
  resume_scheduled_step task instead of resuming inline on the Beat thread.
- Resuming a due delay step must actually deliver the post-delay node. This path was
  once a no-op (the poller sent a `type:"resume"` node the router ignored), so
  trigger -> delay -> email delivered nothing — the behavioral test below guards it.
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

    def test_claims_and_fans_out(self):
        """Each claimed due step is fanned out as its own resume_scheduled_step task."""
        exec_id = uuid.uuid4()
        step_id = uuid.uuid4()
        claimed = {
            "id": step_id,
            "workflow_execution_id": exec_id,
            "next_step_id": "delay-1",
        }

        # First read = claim due steps; second read = due scheduled executions (none).
        with patch("alrt_workers.tasks.delay.execute_read_query", side_effect=[[claimed], []]), \
             patch("alrt_workers.tasks.delay.resume_scheduled_step") as mock_resume:

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            mock_resume.delay.assert_called_once_with(str(step_id), str(exec_id), "delay-1")

    def test_no_due_steps(self):
        """No due steps and no due executions -> nothing fanned out."""
        with patch("alrt_workers.tasks.delay.execute_read_query", side_effect=[[], []]), \
             patch("alrt_workers.tasks.delay.resume_scheduled_step") as mock_resume, \
             patch("alrt_workers.tasks.delay.execute_update_query") as mock_update:

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            mock_resume.delay.assert_not_called()
            mock_update.assert_not_called()

    def test_due_execution_enqueued_via_send_task(self):
        """A due deliver_at execution is claimed (marked running) and enqueued by
        name via celery_app.send_task — not a hand-rolled Redis envelope."""
        exec_id = uuid.uuid4()
        due = {"id": exec_id}
        # First read = due steps (none); second read = due scheduled executions.
        with patch("alrt_workers.tasks.delay.execute_read_query", side_effect=[[], [due]]), \
             patch("alrt_workers.tasks.delay.execute_update_query", return_value=True), \
             patch("alrt_workers.tasks.delay.celery_app") as mock_capp:

            from alrt_workers.tasks.delay import poll_scheduled_steps
            poll_scheduled_steps()

            mock_capp.send_task.assert_called_once_with(
                "alrt_workers.tasks.workflow.execute", args=[str(exec_id)]
            )


class TestResumeScheduledStep:

    def test_resume_delivers_post_delay_step(self):
        """resume_scheduled_step runs the REAL resume path: the post-delay email fires,
        the step is marked completed, and the execution completes."""
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

        def wf_read_one(query, params):
            if "scheduled_steps" in query:
                return None  # no open scheduled steps remain
            if "step_executions" in query:
                return None  # no open ledger rows -> execution may complete
            if "workflow_executions" in query:
                return execution
            if "workflows" in query:
                return workflow
            if "subscribers" in query:
                return subscriber
            return None

        with patch("alrt_workers.tasks.delay.execute_update_query", return_value=True) as delay_update, \
             patch("alrt_workers.tasks.workflow.execute_read_one_query", side_effect=wf_read_one), \
             patch("alrt_workers.tasks.workflow.execute_insert_query", return_value={"id": uuid.uuid4()}), \
             patch("alrt_workers.tasks.workflow.execute_update_query", return_value=True) as wf_update, \
             patch("alrt_workers.tasks.channels.email.deliver") as mock_email:

            mock_email.delay = MagicMock()

            from alrt_workers.tasks.delay import resume_scheduled_step
            resume_scheduled_step(str(step_id), str(execution["id"]), "delay-1")

            # The post-delay email actually fires on resume.
            mock_email.delay.assert_called_once()
            assert mock_email.delay.call_args[0][0] == str(execution["id"])
            assert mock_email.delay.call_args[0][1] == str(subscriber["id"])

            # Scheduled step marked completed (uuid round-trips through the string arg).
            assert any(c[0][1] == [step_id, "completed"] for c in delay_update.call_args_list)

            # Execution marked completed once the branch finished.
            assert any(c[0][1] == [execution["id"], "completed"] for c in wf_update.call_args_list)
