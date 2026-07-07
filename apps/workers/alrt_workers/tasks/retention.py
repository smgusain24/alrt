"""Retention: delete aged rows in batches so the hot tables don't grow forever.

Previously this only flipped notifications to ``status='archived'`` — which no
user-facing query reads (the inbox filters ``is_archived``) and which frees no
space. Retention now *deletes*, leaving ``is_archived`` as the sole user-archive
concept. Dead-letter notifications are kept (operators inspect the DLQ). Nothing
FK-references notifications or event_logs, so the deletes are safe.
"""

import logging
import os

from alrt_workers.celery_app import celery_app
from alrt_workers.db import execute_read_one_query

log = logging.getLogger(__name__)

NOTIFICATION_RETENTION_DAYS = int(os.getenv("NOTIFICATION_RETENTION_DAYS", "90"))
EVENT_LOG_RETENTION_DAYS = int(os.getenv("EVENT_LOG_RETENTION_DAYS", "90"))
BATCH_SIZE = 1000

Q_PURGE_NOTIFICATIONS = """
    WITH deleted AS (
        DELETE FROM notifications
        WHERE id IN (
            SELECT id FROM notifications
            WHERE created_at < now() - ($1 || ' days')::interval
                AND status <> 'dead_letter'
            LIMIT $2
        )
        RETURNING id
    )
    SELECT COUNT(*) AS deleted_count FROM deleted
"""

Q_PURGE_EVENT_LOGS = """
    WITH deleted AS (
        DELETE FROM event_logs
        WHERE id IN (
            SELECT id FROM event_logs
            WHERE created_at < now() - ($1 || ' days')::interval
            LIMIT $2
        )
        RETURNING id
    )
    SELECT COUNT(*) AS deleted_count FROM deleted
"""


def _purge_in_batches(query, days, label):
    """Delete matching rows BATCH_SIZE at a time until fewer than a batch remain."""
    total = 0
    while True:
        row = execute_read_one_query(query, [str(days), BATCH_SIZE])
        count = row["deleted_count"] if row else 0
        total += count
        if count < BATCH_SIZE:
            break
    log.info("Purged %s %s older than %s days", total, label, days)
    return total


@celery_app.task
def purge_old_notifications():
    """Delete notifications older than the retention window (keeps dead_letter)."""
    return _purge_in_batches(Q_PURGE_NOTIFICATIONS, NOTIFICATION_RETENTION_DAYS, "notifications")


@celery_app.task
def purge_old_event_logs():
    """Delete event_logs older than the retention window."""
    return _purge_in_batches(Q_PURGE_EVENT_LOGS, EVENT_LOG_RETENTION_DAYS, "event_logs")
