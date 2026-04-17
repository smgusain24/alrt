"""FastAPI dependency functions for authentication.

Provides two injectable dependencies: ``get_current_team`` (dual JWT / API-key
auth used by most endpoints) and ``get_current_user`` (JWT-only auth used by
dashboard endpoints that need the full user record).
"""

import hashlib
import uuid

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_update_query
from alrt.queries import api_keys as api_key_q, users as user_q

security = HTTPBearer()


async def get_current_team(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> uuid.UUID:
    """Resolve the calling team's UUID from a Bearer token.

    Supports two auth methods, tried in order:
    1. **JWT** -- issued to dashboard users at login/signup.
    2. **API key** (``alrt_sk_`` / ``alrt_ck_``) -- looked up by SHA-256 hash.

    Args:
        credentials: Bearer token extracted by FastAPI's HTTPBearer scheme.

    Returns:
        The ``team_id`` UUID associated with the token.

    Raises:
        HTTPException: 401 if neither method yields a valid team.
    """
    raw_key = credentials.credentials

    # Try JWT first (dashboard sessions)
    try:
        payload = jwt.decode(raw_key, settings.api_secret_key, algorithms=["HS256"])
        team_id = payload.get("team_id")
        if team_id:
            return uuid.UUID(team_id)
    except JWTError:
        pass

    # Fall back to API key lookup
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key = await execute_read_one_query(api_key_q.FIND_BY_HASH, [key_hash])

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Track last used
    await execute_update_query(api_key_q.UPDATE_LAST_USED, [api_key["id"]])

    return api_key["team_id"]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """Return the full user record for a JWT-authenticated dashboard session.

    Unlike ``get_current_team``, this does **not** accept API keys -- it
    requires a JWT containing a ``user_id`` claim and fetches the
    corresponding user row from the database.

    Args:
        credentials: Bearer JWT extracted by FastAPI's HTTPBearer scheme.

    Returns:
        A dict of the user row (id, email, name, team_id, etc.).

    Raises:
        HTTPException: 401 if the token is invalid or the user does not exist.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.api_secret_key, algorithms=["HS256"])
        user_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await execute_read_one_query(user_q.FIND_BY_ID, [uuid.UUID(user_id)])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
