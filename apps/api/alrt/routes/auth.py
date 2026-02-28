import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response
from jose import jwt

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt.queries import users as user_q, teams as team_q, providers as prov_q
from alrt.deps import get_current_user
from alrt.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _create_jwt(user_id: str, team_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "team_id": team_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=JWT_ALGORITHM)


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(body: SignupRequest, response: Response):
    existing = await execute_read_one_query(user_q.FIND_BY_EMAIL, [body.email])
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    team_id = uuid.uuid4()
    team = await execute_insert_query(team_q.CREATE, [team_id, body.team_name])

    user_id = uuid.uuid4()
    user = await execute_insert_query(user_q.CREATE, [
        user_id, body.email, _hash_password(body.password), body.name, team_id
    ])

    # Auto-insert alrt_hosted providers for the new team.
    # Email provider is active immediately — alrt's Resend account handles all sending.
    # Slack provider is inactive until the team completes the OAuth flow.
    await execute_insert_query(prov_q.CREATE_ALRT_HOSTED_EMAIL, [
        uuid.uuid4(), team_id, body.team_name,
    ])
    await execute_insert_query(prov_q.CREATE_ALRT_HOSTED_SLACK, [
        uuid.uuid4(), team_id,
    ])

    token = _create_jwt(str(user_id), str(team_id), body.email)

    response.set_cookie(
        key="alrt_token", value=token, httponly=True,
        secure=settings.cookie_secure, samesite="lax", max_age=JWT_EXPIRY_HOURS * 3600,
    )

    return AuthResponse(user=user, team_id=team_id, token=token)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, response: Response):
    user = await execute_read_one_query(user_q.FIND_BY_EMAIL, [body.email])

    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Account disabled")

    await execute_update_query(user_q.UPDATE_LAST_LOGIN, [user["id"]])

    token = _create_jwt(str(user["id"]), str(user["team_id"]), user["email"])

    response.set_cookie(
        key="alrt_token", value=token, httponly=True,
        secure=settings.cookie_secure, samesite="lax", max_age=JWT_EXPIRY_HOURS * 3600,
    )

    return AuthResponse(user=user, team_id=user["team_id"], token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("alrt_token")
    return {"status": "ok"}
