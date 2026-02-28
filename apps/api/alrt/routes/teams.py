import hashlib
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_insert_query, execute_read_query, execute_read_one_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import api_keys as api_key_q, teams as team_q, quotas as quotas_q
from alrt.schemas.team import (
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    CreateApiKey,
    CreateTeam,
    TeamCreatedResponse,
    TeamResponse,
)

router = APIRouter(prefix="/teams", tags=["teams"])


def _generate_key(key_type: str) -> str:
    prefix = "alrt_sk_" if key_type == "server" else "alrt_ck_"
    return prefix + secrets.token_hex(32)


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


@router.post("", response_model=TeamCreatedResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_team(request: Request, body: CreateTeam):
    team_id = uuid.uuid4()
    team = await execute_insert_query(team_q.CREATE, [team_id, body.name])

    # Auto-create initial server key
    raw_key = _generate_key("server")
    key_id = uuid.uuid4()
    await execute_insert_query(api_key_q.CREATE, [
        key_id, team_id, _hash_key(raw_key), raw_key[:16], "server", None
    ])

    return TeamCreatedResponse(**team, raw_key=raw_key)


@router.post(
    "/{team_id}/api-keys",
    response_model=ApiKeyCreatedResponse,
    status_code=201,
)
@limiter.limit(settings.rate_limit_write)
async def create_team_api_key(
    request: Request,
    team_id: uuid.UUID,
    body: CreateApiKey = CreateApiKey(),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    raw_key = _generate_key(body.key_type)
    key_id = uuid.uuid4()
    key = await execute_insert_query(api_key_q.CREATE, [
        key_id, team_id, _hash_key(raw_key), raw_key[:16], body.key_type, body.name
    ])

    return ApiKeyCreatedResponse(**key, raw_key=raw_key)


@router.get("/{team_id}/api-keys", response_model=list[ApiKeyResponse])
@limiter.limit(settings.rate_limit_read)
async def list_team_api_keys(
    request: Request,
    team_id: uuid.UUID,
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    keys = await execute_read_query(api_key_q.LIST_BY_TEAM, [team_id])
    return keys


@router.delete("/{team_id}/api-keys/{key_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_team_api_key(
    request: Request,
    team_id: uuid.UUID,
    key_id: uuid.UUID,
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    key = await execute_read_one_query(api_key_q.REVOKE, [key_id, team_id])
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")


@router.get("/{team_id}/quota")
@limiter.limit(settings.rate_limit_read)
async def get_team_quota(
    request: Request,
    team_id: uuid.UUID,
    current_team: uuid.UUID = Depends(get_current_team),
):
    """Return current month's quota status for the team."""
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    row = await execute_read_one_query(quotas_q.GET_QUOTA_STATUS, [team_id])
    return {
        "over_limit": row["over_limit"] if row else False,
        "monthly_count": row["monthly_count"] if row else 0,
    }
