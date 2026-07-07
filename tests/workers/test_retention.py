"""Tests for retention — batched DELETE of aged notifications and event logs."""
from unittest.mock import patch

from alrt_workers.tasks import retention


class TestPurgeNotifications:

    def test_deletes_and_keeps_dead_letter(self):
        """Retention DELETEs aged notifications (not soft-archive) and excludes the DLQ."""
        with patch(
            "alrt_workers.tasks.retention.execute_read_one_query",
            side_effect=[{"deleted_count": 1000}, {"deleted_count": 4}],
        ) as mock_q:
            total = retention.purge_old_notifications()

        assert total == 1004          # summed across batches
        assert mock_q.call_count == 2  # looped until a short batch
        query = mock_q.call_args_list[0][0][0]
        assert "DELETE FROM notifications" in query
        assert "status <> 'dead_letter'" in query   # DLQ preserved for inspection
        assert "archived" not in query              # no leftover soft-archive path

    def test_stops_on_short_batch(self):
        with patch(
            "alrt_workers.tasks.retention.execute_read_one_query",
            side_effect=[{"deleted_count": 0}],
        ) as mock_q:
            total = retention.purge_old_notifications()
        assert total == 0
        assert mock_q.call_count == 1


class TestPurgeEventLogs:

    def test_deletes_event_logs(self):
        with patch(
            "alrt_workers.tasks.retention.execute_read_one_query",
            side_effect=[{"deleted_count": 2}],
        ) as mock_q:
            total = retention.purge_old_event_logs()
        assert total == 2
        query = mock_q.call_args_list[0][0][0]
        assert "DELETE FROM event_logs" in query
