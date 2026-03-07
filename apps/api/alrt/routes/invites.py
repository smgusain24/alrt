import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query
from jose import jwt

from alrt.config import settings
from alrt.db import execute_insert_query, execute_read_one_query, execute_read_query, execute_update_query
from alrt.deps import get_current_team, get_current_user
from alrt.middleware.rate_limit import limiter
from alrt.queries import team_invites as invite_q, users as user_q
from alrt.schemas.team_invites import (
    AcceptInviteRequest,
    CreateInviteRequest,
    InviteResponse,
    MemberRecord,
    MembersListResponse,
)

router = APIRouter(tags=["invites"])

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
INVITE_EXPIRY_DAYS = 7


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _create_jwt(user_id: str, team_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "team_id": team_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=JWT_ALGORITHM)


@router.post("/teams/{team_id}/invites", response_model=InviteResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_invite(
    request: Request,
    team_id: uuid.UUID,
    body: CreateInviteRequest,
    current_user: dict = Depends(get_current_user),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    if body.role not in ("admin", "viewer"):
        raise HTTPException(status_code=422, detail="Role must be 'admin' or 'viewer'")

    existing_user = await execute_read_one_query(user_q.FIND_BY_EMAIL, [body.email])
    if existing_user and str(existing_user["team_id"]) == str(team_id):
        raise HTTPException(status_code=409, detail="This email is already a member of your team")

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    invite_id = uuid.uuid4()
    expires_at = datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS)

    invite = await execute_insert_query(invite_q.CREATE_INVITE, [
        invite_id, team_id, body.email, body.role,
        token_hash, current_user["id"], expires_at,
    ])

    return InviteResponse(
        id=invite["id"],
        team_id=invite["team_id"],
        email=invite["email"],
        role=invite["role"],
        expires_at=invite["expires_at"],
        created_at=invite["created_at"],
        invite_url=f"{settings.dashboard_url}/accept-invite?token={raw_token}",
    )


@router.get("/teams/{team_id}/members", response_model=MembersListResponse)
@limiter.limit(settings.rate_limit_read)
async def list_members(
    request: Request,
    team_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = await execute_read_query(invite_q.LIST_MEMBERS, [team_id])
    return MembersListResponse(members=[
        MemberRecord(
            id=row["id"], email=row["email"], name=row.get("name"),
            role=row["role"], created_at=row["created_at"],
            last_login_at=row.get("last_login_at"), record_type=row["record_type"],
        )
        for row in rows
    ])


@router.delete("/teams/{team_id}/invites/{invite_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_invite(
    request: Request,
    team_id: uuid.UUID,
    invite_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    current_team: uuid.UUID = Depends(get_current_team),
):
    if current_team != team_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await execute_update_query(invite_q.DELETE_INVITE, [invite_id, team_id])
    if not result:
        raise HTTPException(status_code=404, detail="Invite not found or already accepted")


@router.get("/auth/accept-invite")
@limiter.limit(settings.rate_limit_public)
async def get_accept_invite_info(
    request: Request,
    token: str = Query(...),
):
    token_hash = _hash_token(token)
    invite = await execute_read_one_query(invite_q.FIND_INVITE_BY_HASH, [token_hash])

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")
    if invite["accepted_at"] is not None:
        raise HTTPException(status_code=410, detail="Invite already accepted")
    if invite["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite has expired")

    return {"email": invite["email"], "role": invite["role"], "team_id": str(invite["team_id"])}


@router.post("/auth/accept-invite", status_code=201)
@limiter.limit(settings.rate_limit_write)
async def accept_invite(
    request: Request,
    body: AcceptInviteRequest,
    response: Response,
):
    token_hash = _hash_token(body.token)
    invite = await execute_read_one_query(invite_q.FIND_INVITE_BY_HASH, [token_hash])

    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")
    if invite["accepted_at"] is not None:
        raise HTTPException(status_code=410, detail="Invite already accepted")
    if invite["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invite has expired")

    existing = await execute_read_one_query(user_q.FIND_BY_EMAIL, [invite["email"]])
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please log in.")

    user_id = uuid.uuid4()
    CREATE_WITH_ROLE = """
        INSERT INTO users (id, email, password_hash, name, team_id, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, role, team_id, is_active, created_at
    """
    user = await execute_insert_query(CREATE_WITH_ROLE, [
        user_id, invite["email"], _hash_password(body.password),
        body.name, invite["team_id"], invite["role"],
    ])

    await execute_update_query(invite_q.ACCEPT_INVITE, [invite["id"]])

    token = _create_jwt(str(user_id), str(invite["team_id"]), invite["email"])
    response.set_cookie(
        key="alrt_token", value=token, httponly=True,
        secure=settings.cookie_secure, samesite="lax", max_age=JWT_EXPIRY_HOURS * 3600,
    )

    return {"token": token, "email": invite["email"], "role": invite["role"]}
