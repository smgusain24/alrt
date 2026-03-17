import logging

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_update_query

logger = logging.getLogger("alrt.workers.billing")

EXPIRE_TRIALS = """
    UPDATE teams SET billing_status = 'expired', updated_at = now()
    WHERE billing_status = 'trialing' AND trial_ends_at < now()
"""

EXPIRE_CANCELLED = """
    UPDATE teams SET billing_status = 'expired', updated_at = now()
    WHERE billing_status = 'cancelled' AND period_ends_at < now()
"""

RESET_MONTHLY_QUOTAS = """
    DELETE FROM team_quotas
    WHERE period_start < date_trunc('month', now())
"""


@celery_app.task
def expire_trials():
    """Mark trialing teams as expired when trial_ends_at has passed."""
    execute_update_query(EXPIRE_TRIALS)
    logger.info("Expired trial teams processed")


@celery_app.task
def expire_cancelled():
    """Mark cancelled teams as expired when period_ends_at has passed."""
    execute_update_query(EXPIRE_CANCELLED)
    logger.info("Expired cancelled teams processed")


@celery_app.task
def reset_monthly_quotas():
    """Delete old month quota rows. New months start fresh via UPSERT on first delivery."""
    execute_update_query(RESET_MONTHLY_QUOTAS)
    logger.info("Monthly quotas reset")
