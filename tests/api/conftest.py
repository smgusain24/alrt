"""API test fixtures — provides an httpx AsyncClient with mocked DB and auth."""
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from tests.conftest import TEAM_ID, USER_ID
from tests.fixtures.data import make_user


@pytest_asyncio.fixture
async def client():
    """Create a test client with mocked DB pool, auth overrides, and disabled rate limiting."""
    # Pre-import the audit_log submodule so patch() can resolve the attribute
    import alrt.middleware.audit_log  # noqa: F401

    with patch("alrt.db.get_pool") as mock_pool, \
         patch("alrt.db.init_pool", new_callable=AsyncMock), \
         patch("alrt.db.ensure_schema", new_callable=AsyncMock), \
         patch("alrt.db.close_pool", new_callable=AsyncMock), \
         patch("alrt.middleware.audit_log.get_pool") as mock_audit_pool:

        # Mock the pool so audit log middleware doesn't crash
        mock_conn = MagicMock()
        mock_conn.execute = AsyncMock()
        mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_conn.__aexit__ = AsyncMock(return_value=False)
        mock_pool_inst = MagicMock()
        mock_pool_inst.acquire.return_value = mock_conn
        mock_pool.return_value = mock_pool_inst
        mock_audit_pool.return_value = mock_pool_inst

        from alrt.main import app
        from alrt.deps import (
            get_current_team,
            get_current_user,
            get_current_principal,
            require_write,
        )

        # Override auth dependencies (default: full-access server principal)
        principal = {"team_id": TEAM_ID, "role": "admin", "key_type": "server",
                     "scope": None, "user_id": USER_ID}
        app.dependency_overrides[get_current_team] = lambda: TEAM_ID
        app.dependency_overrides[get_current_principal] = lambda: principal
        app.dependency_overrides[require_write] = lambda: principal
        app.dependency_overrides[get_current_user] = lambda: make_user(
            id=USER_ID, team_id=TEAM_ID
        )

        # Disable rate limiting for tests
        from alrt.middleware.rate_limit import limiter
        limiter.enabled = False

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac

        app.dependency_overrides.clear()
        limiter.enabled = True
