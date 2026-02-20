import hashlib
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alrt_db.models.api_key import ApiKey


def generate_key(key_type):
    prefix = "alrt_sk_" if key_type == "server" else "alrt_ck_"
    raw = prefix + secrets.token_hex(32)
    return raw


def hash_key(raw_key):
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def create_api_key(db: AsyncSession, team_id, key_type="server"):
    raw_key = generate_key(key_type)
    key = ApiKey(
        team_id=team_id,
        key_hash=hash_key(raw_key),
        key_prefix=raw_key[:16],
        key_type=key_type,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key, raw_key


async def list_api_keys(db: AsyncSession, team_id):
    result = await db.execute(
        select(ApiKey).where(ApiKey.team_id == team_id)
    )
    return result.scalars().all()


async def revoke_api_key(db: AsyncSession, team_id, key_id):
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.team_id == team_id)
    )
    key = result.scalar_one_or_none()
    if not key:
        return None
    key.is_active = False
    await db.commit()
    return key
