"""Auth dependency tests — the subscriber-token escalation and write guards.

Regression guard: a subscriber-scoped WS token (minted for end-user browsers)
must never authenticate team/API endpoints, and read-only callers (client API
keys, viewer users) must be blocked from mutating routes.
"""
import uuid
from datetime import datetime, timezone, timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

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
            await get_current_principal(_creds(token))
        assert exc.value.status_code == 401

    async def test_dashboard_jwt_accepted(self):
        """A normal dashboard JWT resolves to its team and role."""
        team_id = str(uuid.uuid4())
        token = _jwt(team_id=team_id, user_id=str(uuid.uuid4()), role="admin")
        principal = await get_current_principal(_creds(token))
        assert str(principal["team_id"]) == team_id
        assert principal["role"] == "admin"


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
