import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_read_one_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import subscribers as sub_q
from alrt.schemas.subscriber import PushTokenRegister, PushTokenResponse

router = APIRouter(prefix="/subscribers", tags=["push-tokens"])

VALID_PLATFORMS = {"android", "ios", "web"}


@router.post("/{external_id}/push-tokens", response_model=list[PushTokenResponse])
@limiter.limit(settings.rate_limit_write)
async def register_push_token(
    request: Request,
    external_id: str,
    body: PushTokenRegister,
    team_id: uuid.UUID = Depends(get_current_team),
):
    if body.platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Invalid platform. Must be one of: {', '.join(VALID_PLATFORMS)}")

    subscriber = await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, external_id])
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    token_obj = json.dumps([{
        "token": body.token,
        "platform": body.platform,
        "device_id": body.device_id,
        "last_seen": datetime.now(timezone.utc).isoformat(),
    }])

    result = await execute_read_one_query(sub_q.ADD_PUSH_TOKEN, [subscriber["id"], body.token, token_obj])
    return result["push_tokens"] if result else []


@router.delete("/{external_id}/push-tokens/{token}", response_model=list[PushTokenResponse])
@limiter.limit(settings.rate_limit_write)
async def remove_push_token(
    request: Request,
    external_id: str,
    token: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, external_id])
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    result = await execute_read_one_query(sub_q.REMOVE_PUSH_TOKEN, [subscriber["id"], token])
    return result["push_tokens"] if result else []


@router.get("/{external_id}/push-tokens", response_model=list[PushTokenResponse])
@limiter.limit(settings.rate_limit_read)
async def list_push_tokens(
    request: Request,
    external_id: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, external_id])
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    result = await execute_read_one_query(sub_q.GET_PUSH_TOKENS, [subscriber["id"]])
    return result["push_tokens"] if result else []
