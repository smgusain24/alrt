"""Auth dependency tests — the subscriber-token escalation and write guards.

Regression guard: a subscriber-scoped WS token (minted for end-user browsers)
must never authenticate team/API endpoints, and read-only callers (client API
keys, viewer users) must be blocked from mutating routes.
"""
import uuid
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

import alrt.deps as deps
from alrt.config import settings
from alrt.deps import get_current_principal, require_write


def _creds(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _jwt(**claims):
    payload = {"exp": datetime.now(timezone.utc) + timedelta(hours=1), **claims}
    return jwt.encode(payload, settings.api_secret_key, algorithm="HS256")


class TestPrincipalAuth:

    async def test_subscriber_token_rejected(self):
        """A subscriber-scoped token must not authenticate team endpoints."""
        token = _jwt(team_id=str(uuid.uuid4()), sub=str(uuid.uuid4()), scope="subscriber")
        with pytest.raises(HTTPException) as exc:
            await get_current_principal(credentials=_creds(token))
        assert exc.value.status_code == 401

    async def test_dashboard_jwt_accepted(self):
        """A normal dashboard JWT resolves to its team and role."""
        team_id = str(uuid.uuid4())
        token = _jwt(team_id=team_id, user_id=str(uuid.uuid4()), role="admin")
        principal = await get_current_principal(credentials=_creds(token))
        assert str(principal["team_id"]) == team_id
        assert principal["role"] == "admin"

    async def test_no_token_is_401(self):
        """No Bearer header and no cookie → 401, not a 403 or 500."""
        with pytest.raises(HTTPException) as exc:
            await get_current_principal(request=None, credentials=None)
        assert exc.value.status_code == 401

    async def test_cookie_token_accepted(self):
        """When there's no Bearer header, the httponly cookie authenticates."""
        team_id = str(uuid.uuid4())
        token = _jwt(team_id=team_id, user_id=str(uuid.uuid4()), role="admin")
        request = SimpleNamespace(cookies={"alrt_token": token})
        principal = await get_current_principal(request=request, credentials=None)
        assert str(principal["team_id"]) == team_id


class TestRequireWrite:

    def test_blocks_client_key(self):
        p = {"team_id": uuid.uuid4(), "role": None, "key_type": "client", "scope": None, "user_id": None}
        with pytest.raises(HTTPException) as exc:
            require_write(p)
        assert exc.value.status_code == 403

    def test_blocks_viewer(self):
        p = {"team_id": uuid.uuid4(), "role": "viewer", "key_type": None, "scope": None, "user_id": None}
        with pytest.raises(HTTPException) as exc:
            require_write(p)
        assert exc.value.status_code == 403

    def test_allows_server_key(self):
        p = {"team_id": uuid.uuid4(), "role": None, "key_type": "server", "scope": None, "user_id": None}
        assert require_write(p) is p


class TestLastUsedThrottle:

    async def test_last_used_written_once_within_window(self):
        """Two rapid API-key requests write api_keys.last_used_at only once."""
        api_key = {"id": uuid.uuid4(), "team_id": uuid.uuid4(), "key_type": "server"}
        deps._last_used_writes.clear()
        with patch("alrt.deps.execute_read_one_query", new_callable=AsyncMock, return_value=api_key), \
             patch("alrt.deps.execute_update_query", new_callable=AsyncMock) as mock_update:
            # A non-JWT raw key falls through to the API-key hash path.
            await deps._resolve_principal("alrt_sk_rawkey")
            await deps._resolve_principal("alrt_sk_rawkey")

        assert mock_update.await_count == 1
