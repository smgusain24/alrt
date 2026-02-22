from unittest.mock import patch, MagicMock
from alrt_workers.tasks.step_runner import execute_step


def _channel_node(channel):
    return {
        "id": "node-1",
        "type": "channel",
        "data": {
            "channel": channel,
            "workflow_name": "test-workflow",
            "template": {"title": "Test", "body": "Hello"},
        },
    }


def test_channel_allowed_when_no_filter():
    """When allowed_channels is None, all channels should fire."""
    with patch("alrt_workers.tasks.channels.inapp.deliver") as mock:
        mock.delay = MagicMock()
        result = execute_step("exec-1", _channel_node("in_app"), "sub-1", "team-1", {}, {}, allowed_channels=None)
        assert result == "ok"
        mock.delay.assert_called_once()


def test_channel_allowed_when_in_list():
    """When channel is in allowed_channels, it should fire."""
    with patch("alrt_workers.tasks.channels.inapp.deliver") as mock:
        mock.delay = MagicMock()
        result = execute_step("exec-1", _channel_node("in_app"), "sub-1", "team-1", {}, {}, allowed_channels=["in_app", "slack"])
        assert result == "ok"
        mock.delay.assert_called_once()


def test_channel_skipped_when_not_in_list():
    """When channel is NOT in allowed_channels, it should be skipped."""
    with patch("alrt_workers.tasks.channels.email.deliver") as mock:
        mock.delay = MagicMock()
        result = execute_step("exec-1", _channel_node("email"), "sub-1", "team-1", {}, {}, allowed_channels=["in_app", "slack"])
        assert result == "skipped"
        mock.delay.assert_not_called()


def test_channel_skipped_by_preference_even_if_allowed():
    """Subscriber preference should still be respected even if channel is allowed."""
    prefs = {"test-workflow": {"in_app": False}}
    with patch("alrt_workers.tasks.channels.inapp.deliver") as mock:
        mock.delay = MagicMock()
        result = execute_step("exec-1", _channel_node("in_app"), "sub-1", "team-1", {}, prefs, allowed_channels=["in_app"])
        assert result == "skipped"
        mock.delay.assert_not_called()


def test_delay_node_unaffected_by_channels():
    """Delay nodes should work regardless of allowed_channels."""
    node = {"id": "delay-1", "type": "delay", "data": {"duration_seconds": 60}}
    with patch("alrt_workers.tasks.step_runner.sync_session") as mock_session:
        mock_db = MagicMock()
        mock_session.return_value.__enter__ = MagicMock(return_value=mock_db)
        mock_session.return_value.__exit__ = MagicMock(return_value=False)
        result = execute_step("exec-1", node, "sub-1", "team-1", {}, {}, allowed_channels=["in_app"])
        assert result == "paused"
