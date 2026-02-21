import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from alrt.config import settings
from alrt.deps import get_db, get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.team import (
    ApiKeyCreatedResponse,
    ApiKeyResponse,
    CreateApiKey,
    CreateTeam,
    TeamCreatedResponse,
    TeamResponse,
)
from alrt.services.api_key import create_api_key, list_api_keys, revoke_api_key
from alrt_db.models.team import Team

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamCreatedResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_team(request: Request, body: CreateTeam, db: AsyncSession = Depends(get_db)):
    team = Team(name=body.name)
    db.add(team)
    await db.commit()
    await db.refresh(team)

    # Auto-create initial server key
    _, raw_key = await create_api_key(db, team.id, "server")

    resp = TeamCreatedResponse.model_validate(team)
    resp.raw_key = raw_key
    return resp


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
    db: AsyncSession = Depends(get_db),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    key, raw_key = await create_api_key(db, team_id, body.key_type)
    resp = ApiKeyCreatedResponse.model_validate(key)
    resp.raw_key = raw_key
    return resp


@router.get("/{team_id}/api-keys", response_model=list[ApiKeyResponse])
@limiter.limit(settings.rate_limit_read)
async def list_team_api_keys(
    request: Request,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    keys = await list_api_keys(db, team_id)
    return [ApiKeyResponse.model_validate(k) for k in keys]


@router.delete("/{team_id}/api-keys/{key_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_team_api_key(
    request: Request,
    team_id: uuid.UUID,
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    key = await revoke_api_key(db, team_id, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
