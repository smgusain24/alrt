import logging
import os

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query

log = logging.getLogger(__name__)

RETENTION_DAYS = int(os.getenv("NOTIFICATION_RETENTION_DAYS", "90"))
BATCH_SIZE = 1000

Q_ARCHIVE_OLD = """
    WITH archived AS (
        UPDATE notifications
        SET status = 'archived', updated_at = now()
        WHERE id IN (
            SELECT id FROM notifications
            WHERE created_at < now() - ($1 || ' days')::interval
                AND status NOT IN ('archived', 'dead_letter')
            LIMIT $2
        )
        RETURNING id
    )
    SELECT COUNT(*) as archived_count FROM archived
"""


@celery_app.task
def archive_old_notifications():
    """Archive notifications older than RETENTION_DAYS. Runs daily via Beat."""
    total_archived = 0
    while True:
        row = execute_read_one_query(Q_ARCHIVE_OLD, [str(RETENTION_DAYS), BATCH_SIZE])
        count = row["archived_count"] if row else 0
        total_archived += count
        if count < BATCH_SIZE:
            break
    log.info(f"Archived {total_archived} notifications older than {RETENTION_DAYS} days")
