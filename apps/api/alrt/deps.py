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
):
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
):
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
