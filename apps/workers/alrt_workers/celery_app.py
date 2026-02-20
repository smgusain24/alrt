import os

from celery import Celery

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
database_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://alrt:alrt@localhost:5432/alrt")

celery_app = Celery("alrt_workers", broker=broker_url, backend=result_backend)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    imports=["alrt_workers.tasks.workflow", "alrt_workers.tasks.step_runner", "alrt_workers.tasks.delay",
             "alrt_workers.tasks.channels.inapp", "alrt_workers.tasks.channels.email"],
)

celery_app.conf.beat_schedule = {
    "poll-scheduled-steps": {
        "task": "alrt_workers.tasks.delay.poll_scheduled_steps",
        "schedule": 30.0,
    },
}

# Init sync DB engine on worker startup
from alrt_db.session import init_sync_engine
init_sync_engine(database_url)
