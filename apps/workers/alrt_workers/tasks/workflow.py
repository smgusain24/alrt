from alrt_workers.celery_app import celery_app
from alrt_db.session import sync_session
from alrt_db.models.workflow_execution import WorkflowExecution
from alrt_db.models.workflow import Workflow
from alrt_db.models.subscriber import Subscriber


@celery_app.task(bind=True, max_retries=3)
def execute(self, execution_id):
    with sync_session() as db:
        execution = db.get(WorkflowExecution, execution_id)
        if not execution:
            return

        workflow = db.get(Workflow, execution.workflow_id)
        subscriber = db.get(Subscriber, execution.subscriber_id)
        if not workflow or not subscriber:
            execution.status = "failed"
            db.commit()
            return

        definition = workflow.definition or {}
        nodes = definition.get("nodes", [])
        edges = definition.get("edges", [])

        # Build adjacency: source -> target
        next_map = {}
        for edge in edges:
            next_map[edge["source"]] = edge["target"]

        # Find trigger node
        trigger = next(
            (n for n in nodes if n.get("type") == "trigger"),
            None,
        )
        if not trigger:
            execution.status = "failed"
            db.commit()
            return

        # Walk nodes starting from trigger
        node_map = {n["id"]: n for n in nodes}
        current_id = next_map.get(trigger["id"])

        from alrt_workers.tasks.step_runner import execute_step
        while current_id:
            node = node_map.get(current_id)
            if not node:
                break

            result = execute_step(
                str(execution.id),
                node,
                str(subscriber.id),
                str(execution.team_id),
                execution.event_payload or {},
                subscriber.channel_preferences or {},
            )

            # Delay node returns "paused" — stop walking, Celery Beat resumes later
            if result == "paused":
                break

            current_id = next_map.get(current_id)

        if result != "paused":
            execution.status = "completed"
            db.commit()
