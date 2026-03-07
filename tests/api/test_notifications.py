"""Tests for notification-related endpoints."""
import uuid
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import TEAM_ID
from tests.fixtures.data import make_subscriber, make_notification


@pytest.mark.asyncio
class TestListNotifications:
    async def test_list_success(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1")
        notifs = [make_notification(channel="in_app"), make_notification(channel="email")]

        with patch("alrt.routes.notifications.execute_read_one_query", new_callable=AsyncMock) as mock_read_one, \
             patch("alrt.routes.notifications.execute_read_query", new_callable=AsyncMock) as mock_read:
            mock_read_one.return_value = sub
            mock_read.return_value = notifs

            resp = await client.get("/subscribers/user-1/notifications", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 200
            assert len(resp.json()) == 2

    async def test_list_subscriber_not_found(self, client):
        with patch("alrt.routes.notifications.execute_read_one_query", new_callable=AsyncMock) as mock_read_one:
            mock_read_one.return_value = None

            resp = await client.get("/subscribers/nobody/notifications", headers={"Authorization": "Bearer fake"})
            assert resp.status_code == 404


@pytest.mark.asyncio
class TestUpdateNotification:
    async def test_mark_as_read(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1")
        notif_id = uuid.uuid4()
        notif = make_notification(id=notif_id, team_id=TEAM_ID, is_read=True)

        with patch("alrt.routes.notifications.execute_read_one_query", new_callable=AsyncMock) as mock_read_one, \
             patch("alrt.routes.notifications.execute_update_query", new_callable=AsyncMock) as mock_update:
            # 3 calls: resolve subscriber, find notification, UPDATE...RETURNING
            mock_read_one.side_effect = [sub, notif, notif]

            resp = await client.patch(
                f"/subscribers/user-1/notifications/{notif_id}",
                json={"is_read": True},
                headers={"Authorization": "Bearer fake"},
            )
            assert resp.status_code == 200


@pytest.mark.asyncio
class TestMarkAllRead:
    async def test_mark_all_read(self, client):
        sub = make_subscriber(team_id=TEAM_ID, external_id="user-1")

        with patch("alrt.routes.notifications.execute_read_one_query", new_callable=AsyncMock) as mock_read_one, \
             patch("alrt.routes.notifications.execute_update_query", new_callable=AsyncMock) as mock_update:
            mock_read_one.return_value = sub
            mock_update.return_value = True

            resp = await client.post(
                "/subscribers/user-1/notifications/mark-all-read",
                headers={"Authorization": "Bearer fake"},
            )
            assert resp.status_code == 204
