from datetime import datetime, timezone

from sqlalchemy import select

from alrt_workers.celery_app import celery_app
from alrt_db.session import sync_session
from alrt_db.models.scheduled_step import ScheduledStep


@celery_app.task
def poll_scheduled_steps():
    with sync_session() as db:
        result = db.execute(
            select(ScheduledStep).where(
                ScheduledStep.status == "pending",
                ScheduledStep.scheduled_at <= datetime.now(timezone.utc),
            )
        )
        due_steps = result.scalars().all()

        for step in due_steps:
            step.status = "processing"
            db.commit()

            from alrt_workers.tasks.step_runner import execute_step
            # Resume workflow from the delayed step
            execute_step(
                str(step.workflow_execution_id),
                {"id": step.next_step_id, "type": "resume"},
                None,
                None,
                step.payload or {},
                {},
            )

            step.status = "completed"
            db.commit()
