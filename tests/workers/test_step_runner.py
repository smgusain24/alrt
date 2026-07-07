"""Tests for alrt_workers.tasks.step_runner — condition, DND, frequency cap."""
import uuid
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import pytest

from tests.fixtures.data import make_execution, make_workflow, make_subscriber


# ---------------------------------------------------------------------------
# _handle_condition tests
# ---------------------------------------------------------------------------

EXEC_ID = str(uuid.uuid4())
TEAM_ID = str(uuid.uuid4())


def _cond(node, payload):
    """Call _handle_condition with the correlation ids, isolating the skip-record
    write (best-effort DB insert) so unit tests don't touch Postgres."""
    from alrt_workers.tasks.step_runner import _handle_condition
    with patch("alrt_workers.tasks.step_runner._record_skip") as mock_skip:
        result = _handle_condition(EXEC_ID, TEAM_ID, node, payload)
    return result, mock_skip


class TestHandleCondition:

    def test_equals_true(self):
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "equals", "value": "pro",
        }}
        result, mock_skip = _cond(node, {"plan": "pro"})
        assert result == "ok"
        mock_skip.assert_not_called()

    def test_equals_false(self):
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "equals", "value": "pro",
        }}
        result, mock_skip = _cond(node, {"plan": "free"})
        assert result == "skipped"
        # A skip record with a machine-readable reason is written.
        assert mock_skip.call_args[0][4] == "condition_false"

    def test_not_equals_true(self):
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "not_equals", "value": "pro",
        }}
        result, mock_skip = _cond(node, {"plan": "free"})
        assert result == "ok"

    def test_not_equals_false(self):
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "not_equals", "value": "pro",
        }}
        result, _ = _cond(node, {"plan": "pro"})
        assert result == "skipped"

    def test_exists_true(self):
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "exists",
        }}
        result, _ = _cond(node, {"plan": "anything"})
        assert result == "ok"

    def test_exists_false(self):
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "plan", "operator": "exists",
        }}
        result, _ = _cond(node, {"other_field": "value"})
        assert result == "skipped"

    def test_missing_field_returns_skipped(self):
        """When the field is absent from payload, equals comparison returns skipped
        because payload.get(field) returns None which != value."""
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "missing_field", "operator": "equals", "value": "anything",
        }}
        result, _ = _cond(node, {"other": "data"})
        assert result == "skipped"

    def test_condition_error_records_reason(self):
        """A comparison that raises (e.g. greater_than on a non-numeric) is skipped
        and recorded as condition_error."""
        node = {"id": "cond-1", "type": "condition", "data": {
            "field": "amount", "operator": "greater_than", "value": 5,
        }}
        result, mock_skip = _cond(node, {"amount": "not-a-number"})
        assert result == "skipped"
        assert mock_skip.call_args[0][4] == "condition_error"


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

        with patch("alrt_workers.tasks.step_runner.redis") as mock_redis_module, \
             patch("alrt_workers.tasks.step_runner._record_skip") as mock_skip:
            mock_redis_module.Redis.from_url.return_value = mock_redis_instance

            from alrt_workers.tasks.step_runner import execute_step

            result = execute_step(
                execution_id, node, subscriber_id, team_id,
                {"key": "value"}, preferences,
            )

            assert result == "skipped"
            mock_redis_instance.incr.assert_called_once()
            assert mock_skip.call_args[0][4] == "frequency_cap"


# ---------------------------------------------------------------------------
# Channel preference / allowlist skip records
# ---------------------------------------------------------------------------

class TestChannelSkips:

    def _email_node(self):
        return {"id": "email-1", "type": "channel", "data": {
            "channel": "email", "template": {"title": "Hi", "body": "Hello"},
        }}

    def test_channel_not_allowed_records_reason(self):
        execution_id = str(uuid.uuid4())
        with patch("alrt_workers.tasks.step_runner._record_skip") as mock_skip:
            from alrt_workers.tasks.step_runner import execute_step
            result = execute_step(
                execution_id, self._email_node(), str(uuid.uuid4()), str(uuid.uuid4()),
                {}, {"global": {"email": True}}, allowed_channels=["slack"],
            )
        assert result == "skipped"
        assert mock_skip.call_args[0][4] == "channel_not_allowed"

    def test_global_pref_off_records_reason(self):
        execution_id = str(uuid.uuid4())
        with patch("alrt_workers.tasks.step_runner._record_skip") as mock_skip:
            from alrt_workers.tasks.step_runner import execute_step
            result = execute_step(
                execution_id, self._email_node(), str(uuid.uuid4()), str(uuid.uuid4()),
                {}, {"global": {"email": False}},
            )
        assert result == "skipped"
        assert mock_skip.call_args[0][4] == "pref_global_off"

    def test_category_pref_off_records_reason(self):
        execution_id = str(uuid.uuid4())
        with patch("alrt_workers.tasks.step_runner._record_skip") as mock_skip:
            from alrt_workers.tasks.step_runner import execute_step
            result = execute_step(
                execution_id, self._email_node(), str(uuid.uuid4()), str(uuid.uuid4()),
                {}, {"global": {"email": True}, "categories": {"billing": {"email": False}}},
                workflow_category="billing",
            )
        assert result == "skipped"
        assert mock_skip.call_args[0][4] == "pref_category_off"
