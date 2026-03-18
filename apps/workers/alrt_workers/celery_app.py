import os
from pathlib import Path

for env_path in [Path(__file__).resolve().parents[3] / ".env", Path(".env")]:
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())
        break

from celery import Celery
from celery.schedules import crontab

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
broker_url = os.getenv("CELERY_BROKER_URL", redis_url)
result_backend = os.getenv("CELERY_RESULT_BACKEND", redis_url)

celery_app = Celery("alrt_workers", broker=broker_url, backend=result_backend)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "alrt_workers.tasks.channels.email.deliver": {"queue": "email"},
        "alrt_workers.tasks.channels.slack.deliver": {"queue": "slack"},
        "alrt_workers.tasks.channels.inapp.deliver": {"queue": "inapp"},
        "alrt_workers.tasks.channels.whatsapp.deliver": {"queue": "whatsapp"},
        "alrt_workers.tasks.channels.discord.deliver":  {"queue": "discord"},
        "alrt_workers.tasks.channels.telegram.deliver": {"queue": "telegram"},
        "alrt_workers.tasks.channels.sms.deliver": {"queue": "sms"},
        "alrt_workers.tasks.channels.push.deliver": {"queue": "push"},
    },
    imports=["alrt_workers.tasks.workflow", "alrt_workers.tasks.step_runner", "alrt_workers.tasks.delay",
             "alrt_workers.tasks.channels.inapp", "alrt_workers.tasks.channels.email",
             "alrt_workers.tasks.channels.slack", "alrt_workers.tasks.retention",
             "alrt_workers.tasks.channels.whatsapp", "alrt_workers.tasks.channels.discord",
             "alrt_workers.tasks.channels.telegram", "alrt_workers.tasks.billing",
             "alrt_workers.tasks.channels.sms", "alrt_workers.tasks.channels.push"],
)

celery_app.conf.beat_schedule = {
    "poll-scheduled-steps": {
        "task": "alrt_workers.tasks.delay.poll_scheduled_steps",
        "schedule": 30.0,
    },
    "archive-old-notifications": {
        "task": "alrt_workers.tasks.retention.archive_old_notifications",
        "schedule": 86400.0,  # 24 hours
    },
    "expire-trials": {
        "task": "alrt_workers.tasks.billing.expire_trials",
        "schedule": 86400.0,
    },
    "expire-cancelled": {
        "task": "alrt_workers.tasks.billing.expire_cancelled",
        "schedule": 86400.0,
    },
    "reset-monthly-quotas": {
        "task": "alrt_workers.tasks.billing.reset_monthly_quotas",
        "schedule": crontab(day_of_month=1, hour=0, minute=0),
    },
}

# Reject malformed messages instead of crashing the worker
@celery_app.on_after_configure.connect
def setup_error_handling(sender, **kwargs):
    import logging
    logger = logging.getLogger("alrt.workers")

    from celery.signals import task_rejected

    @task_rejected.connect
    def on_task_rejected(sender=None, body=None, **kwargs):
        logger.warning(f"Task rejected (malformed message): {body}")
