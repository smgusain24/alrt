import logging

from alrt_workers.celery_app import celery_app
from alrt_workers.utils.retry import SLACK_RETRY

log = logging.getLogger(__name__)


@celery_app.task(bind=True, **SLACK_RETRY.as_task_kwargs())
def deliver(self, execution_id, subscriber_id, team_id, template_data, payload, notification_id=None):
    # TODO: Implement Slack delivery (Month 2 milestone)
    raise NotImplementedError("Slack channel not yet implemented")
