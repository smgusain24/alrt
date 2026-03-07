"""Tests for alrt_workers.tasks.channels.inapp — in-app delivery task."""
import json
import uuid
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest

from tests.fixtures.data import make_subscriber


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_self():
    mock = MagicMock()
    mock.request.retries = 0
    mock.max_retries = 3
    return mock


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestInAppDeliver:

    def test_create_and_publish(self):
        """Subscriber found -> notification created, Redis publish called, marked sent."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub = make_subscriber(team_id=team_id)
        notif_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.inapp.execute_read_one_query", return_value=sub), \
             patch("alrt_workers.tasks.channels.inapp.execute_insert_query", return_value={"id": notif_id, "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc)}) as mock_insert, \
             patch("alrt_workers.tasks.channels.inapp.execute_update_query", return_value=True) as mock_update, \
             patch("alrt_workers.tasks.channels.inapp.redis") as mock_redis_mod:

            mock_redis_instance = MagicMock()
            mock_redis_mod.Redis.from_url.return_value = mock_redis_instance

            from alrt_workers.tasks.channels.inapp import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub["id"]),
                str(team_id),
                {"title": "New Message", "body": "You have a message"},
                {"key": "value"},
            )

            # Notification created
            mock_insert.assert_called_once()

            # Redis publish called on correct channel
            mock_redis_instance.publish.assert_called_once()
            channel_arg = mock_redis_instance.publish.call_args[0][0]
            assert channel_arg == f"subscriber:{sub['id']}"

            # Published message is valid JSON with expected structure
            published_data = json.loads(mock_redis_instance.publish.call_args[0][1])
            assert published_data["type"] == "notification"
            # The id is the internally-generated uuid4, verify it's a valid UUID string
            uuid.UUID(published_data["data"]["id"])

            # Notification marked sent
            mock_update.assert_called_once()
            assert "status = 'sent'" in mock_update.call_args[0][0]

    def test_subscriber_not_found(self):
        """Subscriber lookup returns None -> returns without sending."""
        team_id = uuid.uuid4()
        exec_id = uuid.uuid4()
        sub_id = uuid.uuid4()

        with patch("alrt_workers.tasks.channels.inapp.execute_read_one_query", return_value=None), \
             patch("alrt_workers.tasks.channels.inapp.execute_insert_query") as mock_insert, \
             patch("alrt_workers.tasks.channels.inapp.redis") as mock_redis_mod:

            from alrt_workers.tasks.channels.inapp import deliver
            deliver(
                _mock_self(),
                str(exec_id),
                str(sub_id),
                str(team_id),
                {"title": "Hello", "body": "World"},
                {},
            )

            # No notification created, no Redis publish
            mock_insert.assert_not_called()
            mock_redis_mod.Redis.from_url.assert_not_called()
