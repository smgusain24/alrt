"""Celery producer for the API.

The API doesn't import the workers package, so it can't reach `celery_app` directly.
A minimal producer configured with the same broker lets us enqueue worker tasks by
name — Celery builds the protocol envelope instead of us hand-rolling it. Tasks the
API enqueues (`workflow.execute`, `bulk.process_bulk_batch`) route to the default
`celery` queue, so no task_routes are needed here.
"""

from celery import Celery

from alrt.config import settings

_producer = Celery("alrt_api_producer", broker=settings.redis_url)


def enqueue(task_name: str, args: list) -> None:
    """Publish a Celery task by name with positional args (blocking Redis I/O)."""
    _producer.send_task(task_name, args=args)
