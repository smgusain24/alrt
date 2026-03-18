"""Billing API tests — quota enforcement, plan listing, subscribe, cancel, webhook."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import TEAM_ID
from tests.fixtures.data import make_plan


# -- Quota enforcement tests --------------------------------------------------

@pytest.mark.asyncio
async def test_trigger_blocked_when_trial_expired(client):
    """Expired trial returns 402."""
    from alrt.main import app
    from alrt.billing.deps import enforce_quota
    from fastapi import HTTPException

    async def _expired_quota():
        raise HTTPException(status_code=402, detail="Trial expired, please upgrade")

    app.dependency_overrides[enforce_quota] = _expired_quota

    resp = await client.post("/events/trigger", json={
        "event": "test.event",
        "subscriber": {"id": "user-1"},
        "payload": {},
    })
    assert resp.status_code == 402
    assert "upgrade" in resp.json()["detail"].lower()
    del app.dependency_overrides[enforce_quota]


@pytest.mark.asyncio
async def test_trigger_blocked_when_free_quota_exceeded(client):
    """Free tier over quota returns 429."""
    from alrt.main import app
    from alrt.billing.deps import enforce_quota
    from fastapi import HTTPException

    async def _over_quota():
        raise HTTPException(status_code=429, detail="Monthly quota exceeded. Upgrade your plan.")

    app.dependency_overrides[enforce_quota] = _over_quota

    resp = await client.post("/events/trigger", json={
        "event": "test.event",
        "subscriber": {"id": "user-1"},
        "payload": {},
    })
    assert resp.status_code == 429
    assert "quota" in resp.json()["detail"].lower()
    del app.dependency_overrides[enforce_quota]


@pytest.mark.asyncio
async def test_trigger_allowed_when_pro_over_quota(client):
    """Pro tier over quota still sends (soft limit) — enforce_quota passes."""
    from alrt.main import app
    from alrt.billing.deps import enforce_quota

    # enforce_quota passes (returns team_id) — pro plan doesn't hard-block
    app.dependency_overrides[enforce_quota] = lambda: TEAM_ID

    with patch("alrt.routes.events.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
         patch("alrt.routes.events.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
         patch("alrt.routes.events.aioredis") as mock_redis_module:

        workflow = {
            "id": uuid.uuid4(), "team_id": TEAM_ID, "event_name": "test.event",
            "status": "published", "definition": {
                "nodes": [{"id": "t1", "type": "trigger", "data": {}}],
                "edges": [],
            },
        }
        execution = {"id": uuid.uuid4(), "status": "running"}

        mock_read.return_value = workflow
        mock_insert.side_effect = [
            {"id": uuid.uuid4(), "external_id": "user-1"},  # subscriber
            execution,  # execution
        ]

        mock_conn = MagicMock()
        mock_conn.set = AsyncMock()
        mock_conn.lpush = AsyncMock()
        mock_conn.close = AsyncMock()
        mock_redis_module.from_url.return_value = mock_conn

        resp = await client.post("/events/trigger", json={
            "workflow": "test.event",
            "subscriber_id": "user-1",
            "payload": {},
        })
        assert resp.status_code == 202

    del app.dependency_overrides[enforce_quota]


# -- Enforce quota unit tests --------------------------------------------------

@pytest.mark.asyncio
async def test_enforce_quota_allows_trialing_under_limit():
    """enforce_quota returns team_id when trialing and under quota."""
    from alrt.billing.deps import enforce_quota

    mock_row = {
        "billing_status": "trialing",
        "trial_ends_at": datetime.now(timezone.utc) + timedelta(days=15),
        "period_ends_at": None,
        "plan_name": "free",
        "quota_limit": 1000,
        "quota_used": 500,
    }
    with patch("alrt.billing.deps.execute_read_one_query", new_callable=AsyncMock, return_value=mock_row):
        result = await enforce_quota(team_id=TEAM_ID)
        assert result == TEAM_ID


@pytest.mark.asyncio
async def test_enforce_quota_blocks_expired():
    """enforce_quota raises 402 for expired teams."""
    from alrt.billing.deps import enforce_quota
    from fastapi import HTTPException

    mock_row = {
        "billing_status": "expired",
        "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=1),
        "period_ends_at": None,
        "plan_name": "free",
        "quota_limit": 1000,
        "quota_used": 50,
    }
    with patch("alrt.billing.deps.execute_read_one_query", new_callable=AsyncMock, return_value=mock_row):
        with pytest.raises(HTTPException) as exc_info:
            await enforce_quota(team_id=TEAM_ID)
        assert exc_info.value.status_code == 402


@pytest.mark.asyncio
async def test_enforce_quota_blocks_free_over_limit():
    """enforce_quota raises 429 for free tier over quota."""
    from alrt.billing.deps import enforce_quota
    from fastapi import HTTPException

    mock_row = {
        "billing_status": "trialing",
        "trial_ends_at": datetime.now(timezone.utc) + timedelta(days=15),
        "period_ends_at": None,
        "plan_name": "free",
        "quota_limit": 1000,
        "quota_used": 1000,
    }
    with patch("alrt.billing.deps.execute_read_one_query", new_callable=AsyncMock, return_value=mock_row):
        with pytest.raises(HTTPException) as exc_info:
            await enforce_quota(team_id=TEAM_ID)
        assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_enforce_quota_allows_pro_over_limit():
    """enforce_quota passes for pro tier even when over quota (soft limit)."""
    from alrt.billing.deps import enforce_quota

    mock_row = {
        "billing_status": "active",
        "trial_ends_at": None,
        "period_ends_at": datetime.now(timezone.utc) + timedelta(days=20),
        "plan_name": "pro",
        "quota_limit": 25000,
        "quota_used": 30000,
    }
    with patch("alrt.billing.deps.execute_read_one_query", new_callable=AsyncMock, return_value=mock_row):
        result = await enforce_quota(team_id=TEAM_ID)
        assert result == TEAM_ID


# -- Plan listing tests -------------------------------------------------------

@pytest.mark.asyncio
async def test_list_plans(client):
    """GET /billing/plans returns active plans."""
    plans = [
        make_plan(name="free", quota_limit=1000, sort_order=0),
        make_plan(name="pro", price_inr=99900, quota_limit=25000, sort_order=1),
    ]
    with patch("alrt.routes.billing.execute_read_query", new_callable=AsyncMock, return_value=plans):
        resp = await client.get("/billing/plans")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["name"] == "free"


# -- Webhook tests -------------------------------------------------------------

@pytest.mark.asyncio
async def test_webhook_invalid_signature(client):
    """Webhook with bad signature returns 400."""
    from alrt.main import app
    from alrt.billing.deps import get_billing_provider

    mock_provider = MagicMock()
    mock_provider.verify_webhook.return_value = None
    app.dependency_overrides[get_billing_provider] = lambda: mock_provider

    resp = await client.post(
        "/billing/webhook",
        content=b'{"event": "test"}',
        headers={"x-razorpay-signature": "bad"},
    )
    assert resp.status_code == 400
    del app.dependency_overrides[get_billing_provider]


@pytest.mark.asyncio
async def test_webhook_valid_signature_processes_event(client):
    """Valid webhook processes subscription.activated event."""
    from alrt.main import app
    from alrt.billing.deps import get_billing_provider

    mock_provider = MagicMock()
    mock_provider.verify_webhook.return_value = {
        "event_type": "subscription.activated",
        "event_id": "evt_123",
        "subscription_id": "sub_123",
        "status": "active",
        "current_period_end": 1711929600,
        "notes": {"team_id": str(TEAM_ID)},
    }
    app.dependency_overrides[get_billing_provider] = lambda: mock_provider

    with patch("alrt.routes.billing.execute_insert_query", new_callable=AsyncMock) as mock_insert, \
         patch("alrt.routes.billing.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
         patch("alrt.routes.billing.execute_update_query", new_callable=AsyncMock) as mock_update:

        mock_insert.return_value = {"id": uuid.uuid4()}  # billing_event inserted
        mock_read.return_value = {"plan_id": uuid.uuid4()}  # team billing lookup

        resp = await client.post(
            "/billing/webhook",
            content=b'{"event": "subscription.activated"}',
            headers={"x-razorpay-signature": "valid"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "processed"
        mock_update.assert_called()

    del app.dependency_overrides[get_billing_provider]


@pytest.mark.asyncio
async def test_webhook_dedup_ignores_duplicate(client):
    """Duplicate event_id is ignored (ON CONFLICT DO NOTHING returns None)."""
    from alrt.main import app
    from alrt.billing.deps import get_billing_provider

    mock_provider = MagicMock()
    mock_provider.verify_webhook.return_value = {
        "event_type": "subscription.activated",
        "event_id": "evt_123",
        "subscription_id": "sub_123",
        "status": "active",
        "current_period_end": None,
        "notes": {"team_id": str(TEAM_ID)},
    }
    app.dependency_overrides[get_billing_provider] = lambda: mock_provider

    with patch("alrt.routes.billing.execute_insert_query", new_callable=AsyncMock) as mock_insert:
        mock_insert.return_value = None  # duplicate — ON CONFLICT DO NOTHING

        resp = await client.post(
            "/billing/webhook",
            content=b'{"event": "subscription.activated"}',
            headers={"x-razorpay-signature": "valid"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "duplicate"

    del app.dependency_overrides[get_billing_provider]


# -- Subscribe/Cancel tests ---------------------------------------------------

@pytest.mark.asyncio
async def test_subscribe_returns_checkout_url(client):
    """POST /billing/subscribe returns checkout_url."""
    from alrt.main import app
    from alrt.billing.deps import get_billing_provider

    plan_id = uuid.uuid4()
    mock_provider = MagicMock()
    mock_provider.create_subscription = AsyncMock(return_value={
        "subscription_id": "sub_abc",
        "checkout_url": "https://rzp.io/checkout/abc",
        "provider_data": {},
    })
    app.dependency_overrides[get_billing_provider] = lambda: mock_provider

    with patch("alrt.routes.billing.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
         patch("alrt.routes.billing.execute_update_query", new_callable=AsyncMock):

        mock_read.side_effect = [
            {"id": plan_id, "name": "pro", "display_name": "Pro", "price_inr": 99900, "quota_limit": 25000, "features": {}},  # plan lookup
            {"billing_status": "trialing", "subscription_id": None},  # team billing
            {"email": "admin@test.com"},  # admin email
        ]

        resp = await client.post("/billing/subscribe", json={"plan_id": str(plan_id)})
        assert resp.status_code == 201
        data = resp.json()
        assert data["checkout_url"] == "https://rzp.io/checkout/abc"
        assert data["subscription_id"] == "sub_abc"

    del app.dependency_overrides[get_billing_provider]


@pytest.mark.asyncio
async def test_cancel_subscription(client):
    """POST /billing/cancel cancels active subscription."""
    from alrt.main import app
    from alrt.billing.deps import get_billing_provider

    mock_provider = MagicMock()
    mock_provider.cancel_subscription = AsyncMock(return_value=True)
    app.dependency_overrides[get_billing_provider] = lambda: mock_provider

    with patch("alrt.routes.billing.execute_read_one_query", new_callable=AsyncMock) as mock_read, \
         patch("alrt.routes.billing.execute_update_query", new_callable=AsyncMock) as mock_update:

        mock_read.return_value = {
            "billing_status": "active",
            "subscription_id": "sub_abc",
            "plan_id": uuid.uuid4(),
        }

        resp = await client.post("/billing/cancel")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"
        mock_update.assert_called()

    del app.dependency_overrides[get_billing_provider]
