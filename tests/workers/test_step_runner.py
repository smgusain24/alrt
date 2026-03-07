"""Tests for alrt_workers.tasks.step_runner — condition, DND, frequency cap."""
import uuid
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import pytest

from tests.fixtures.data import make_execution, make_workflow, make_subscriber


# ---------------------------------------------------------------------------
# _handle_condition tests
# ---------------------------------------------------------------------------

class TestHandleCondition:

    def test_equals_true(self):
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "equals", "value": "pro",
        }}
        result = _handle_condition(node, {"plan": "pro"})
        assert result == "ok"

    def test_equals_false(self):
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "equals", "value": "pro",
        }}
        result = _handle_condition(node, {"plan": "free"})
        assert result == "skipped"

    def test_not_equals_true(self):
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "not_equals", "value": "pro",
        }}
        result = _handle_condition(node, {"plan": "free"})
        assert result == "ok"

    def test_not_equals_false(self):
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "not_equals", "value": "pro",
        }}
        result = _handle_condition(node, {"plan": "pro"})
        assert result == "skipped"

    def test_exists_true(self):
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "exists",
        }}
        result = _handle_condition(node, {"plan": "anything"})
        assert result == "ok"

    def test_exists_false(self):
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "exists",
        }}
        result = _handle_condition(node, {"other_field": "value"})
        assert result == "skipped"

    def test_missing_field_returns_skipped(self):
        """When the field is absent from payload, equals comparison returns skipped
        because payload.get(field) returns None which != value."""
        from alrt_workers.tasks.step_runner import _handle_condition

        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "missing_field", "operator": "equals", "value": "anything",
        }}
        result = _handle_condition(node, {"other": "data"})
        assert result == "skipped"


# ---------------------------------------------------------------------------
# DND tests
# ---------------------------------------------------------------------------

class TestDND:

    def test_channel_paused_during_dnd(self):
        """When current time is inside the DND window, channel step returns paused."""
        execution_id = str(uuid.uuid4())
        subscriber_id = str(uuid.uuid4())
        team_id = str(uuid.uuid4())
        node = {"id": "email-1", "type": "channel", "data": {
            "channel": "email", "template": {"title": "Hi", "body": "Hello"},
        }}

        # DND window: 00:00-23:59 (all day) in UTC — guarantees we are inside it
        preferences = {
            "global": {"email": True},
            "dnd": {
                "start": "00:00",
                "end": "23:59",
                "timezone": "UTC",
            },
        }

        with patch("alrt_workers.tasks.step_runner.execute_insert_query") as mock_insert:
            from alrt_workers.tasks.step_runner import execute_step

            result = execute_step(
                execution_id, node, subscriber_id, team_id,
                {"key": "value"}, preferences,
            )

            assert result == "paused"
            # A scheduled_step row was inserted to reschedule
            mock_insert.assert_called_once()


# ---------------------------------------------------------------------------
# Frequency cap tests
# ---------------------------------------------------------------------------

class TestFrequencyCap:

    def test_channel_skipped_when_over_cap(self):
        """When Redis counter exceeds max_per_day, channel returns skipped."""
        execution_id = str(uuid.uuid4())
        subscriber_id = str(uuid.uuid4())
        team_id = str(uuid.uuid4())
        node = {"id": "email-1", "type": "channel", "data": {
            "channel": "email", "template": {"title": "Hi", "body": "Hello"},
        }}

        preferences = {
            "global": {"email": True},
            "frequency": {"max_per_day": 3},
        }

        mock_redis_instance = MagicMock()
        # incr returns 4, which exceeds max_per_day=3
        mock_redis_instance.incr.return_value = 4

        with patch("alrt_workers.tasks.step_runner.redis") as mock_redis_module:
            mock_redis_module.Redis.from_url.return_value = mock_redis_instance

            from alrt_workers.tasks.step_runner import execute_step

            result = execute_step(
                execution_id, node, subscriber_id, team_id,
                {"key": "value"}, preferences,
            )

            assert result == "skipped"
            mock_redis_instance.incr.assert_called_once()
