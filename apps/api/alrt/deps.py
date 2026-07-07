"""FastAPI authentication dependencies.

A single principal is resolved per request (`get_current_principal`) carrying the
team plus the caller's role / API-key type / token scope. Everything else derives
from it: `get_current_team` for the team id, `require_write` to block read-only
callers on mutating routes. `get_current_user` stays JWT-only for dashboard routes
that need the full user row.
"""

import hashlib
import time
import uuid

from fastapi import Depends, HTTPException, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_update_query
from alrt.queries import api_keys as api_key_q, users as user_q

# auto_error=False so a missing Authorization header falls through to the
# httponly session cookie instead of erroring — the dashboard authenticates
# via the cookie, API clients via the Bearer header.
security = HTTPBearer(auto_error=False)

_COOKIE_NAME = "alrt_token"


def _extract_token(request, credentials):
    """Bearer header first, then the httponly session cookie."""
    if credentials:
        return credentials.credentials
    if request is not None:
        return request.cookies.get(_COOKIE_NAME)
    return None

# Throttle the api_keys.last_used_at write: without this it fires on every
# API-key request, hammering a hot table. last_used_at is an approximate
# "last seen" — ~1min granularity per process is plenty.
_LAST_USED_THROTTLE_S = 60.0
_last_used_writes: dict = {}


def _should_write_last_used(key_id) -> bool:
    """True at most once per throttle window per key in this process."""
    now = time.monotonic()
    prev = _last_used_writes.get(key_id)
    if prev is not None and now - prev < _LAST_USED_THROTTLE_S:
        return False
    _last_used_writes[key_id] = now
    return True


async def _resolve_principal(raw_key: str) -> dict:
    """Resolve a raw token to a principal dict.

    Tries JWT first (dashboard sessions and subscriber WS tokens), then falls back
    to an API-key hash lookup. Returns keys: team_id, role, key_type, scope, user_id.
    """
    try:
        payload = jwt.decode(raw_key, settings.api_secret_key, algorithms=["HS256"])
    except JWTError:
        payload = None

    if payload is not None:
        team_id = payload.get("team_id")
        if not team_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {
            "team_id": uuid.UUID(team_id),
            "role": payload.get("role"),
            "key_type": None,
            "scope": payload.get("scope"),
            "user_id": payload.get("user_id"),
        }

    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key = await execute_read_one_query(api_key_q.FIND_BY_HASH, [key_hash])
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    if _should_write_last_used(api_key["id"]):
        await execute_update_query(api_key_q.UPDATE_LAST_USED, [api_key["id"]])
    return {
        "team_id": api_key["team_id"],
        "role": None,
        "key_type": api_key.get("key_type"),
        "scope": None,
        "user_id": None,
    }


async def get_current_principal(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Resolve the calling principal, rejecting subscriber WS tokens.

    Subscriber-scoped tokens are minted for end-user browsers (in-app WebSocket
    delivery only) and must never authenticate team/API endpoints.
    """
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    principal = await _resolve_principal(token)
    if principal["scope"] == "subscriber":
        raise HTTPException(status_code=401, detail="Subscriber tokens cannot access team resources")
    return principal


async def get_current_team(
    principal: dict = Depends(get_current_principal),
) -> uuid.UUID:
    """Return the calling team's UUID (JWT or API key)."""
    return principal["team_id"]


def require_write(principal: dict = Depends(get_current_principal)) -> dict:
    """Block read-only callers from mutating routes.

    Client API keys (`alrt_ck_`) and viewer users are read-only; they get 403 on
    any route that depends on this. Apply to POST/PUT/PATCH/DELETE endpoints.
    """
    if principal["key_type"] == "client":
        raise HTTPException(status_code=403, detail="Client API keys are read-only")
    if principal["role"] == "viewer":
        raise HTTPException(status_code=403, detail="Viewer role cannot modify resources")
    return principal


async def get_current_user(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Return the full user record for a JWT-authenticated dashboard session.

    Requires a JWT with a ``user_id`` claim; API keys and subscriber tokens are
    rejected.
    """
    token = _extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, settings.api_secret_key, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await execute_read_one_query(user_q.FIND_BY_ID, [uuid.UUID(user_id)])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
