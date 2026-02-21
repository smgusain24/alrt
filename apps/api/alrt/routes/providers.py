import uuid

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alrt.config import settings
from alrt.deps import get_db, get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.schemas.provider import CreateProvider, ProviderResponse
from alrt_db.models.provider import Provider

router = APIRouter(prefix="/providers", tags=["providers"])


def _get_fernet():
    return Fernet(settings.encryption_key.encode())


def _encrypt_config(config: dict) -> dict:
    import json
    f = _get_fernet()
    encrypted = f.encrypt(json.dumps(config).encode()).decode()
    return {"encrypted": encrypted}


def _decrypt_config(config: dict) -> dict:
    import json
    f = _get_fernet()
    return json.loads(f.decrypt(config["encrypted"].encode()))


@router.post("", response_model=ProviderResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_provider(
    request: Request,
    body: CreateProvider,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    provider = Provider(
        team_id=team_id,
        channel=body.channel,
        provider_type=body.provider_type,
        config=_encrypt_config(body.config),
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return ProviderResponse.model_validate(provider)


@router.get("", response_model=list[ProviderResponse])
@limiter.limit(settings.rate_limit_read)
async def list_providers(
    request: Request,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Provider).where(Provider.team_id == team_id)
    )
    return [ProviderResponse.model_validate(p) for p in result.scalars().all()]


@router.delete("/{provider_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_provider(
    request: Request,
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Provider).where(Provider.id == provider_id, Provider.team_id == team_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    await db.delete(provider)
    await db.commit()
