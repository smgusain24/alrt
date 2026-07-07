"""Authentication routes for dashboard signup, login, and session management.

All endpoints in this module operate on JWT-based cookie sessions.  API-key
authentication is handled separately in ``alrt.deps``.
"""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_insert_query, execute_update_query
from alrt.queries import users as user_q, teams as team_q
from alrt.deps import get_current_user
from alrt.middleware.rate_limit import limiter
from alrt.schemas.auth import AuthResponse, LoginRequest, SignupRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def _hash_password(password: str) -> str:
    """Return a bcrypt hash of ``password``."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    """Check ``password`` against a bcrypt ``password_hash``."""
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _create_jwt(user_id: str, team_id: str, email: str, role: str) -> str:
    """Build a signed HS256 JWT containing user, team, email, and role claims."""
    payload = {
        "user_id": user_id,
        "team_id": team_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=JWT_ALGORITHM)


@router.post("/signup", response_model=AuthResponse, status_code=201)
@limiter.limit(settings.rate_limit_auth)
async def signup(request: Request, body: SignupRequest, response: Response):
    """Register a new user, create their team, and issue a JWT cookie.

    The signup flow creates a Team first, then a User linked to that team.
    A JWT is set as an ``httponly`` cookie for immediate dashboard access.

    Raises:
        HTTPException: 409 if the email is already registered.
    """
    existing = await execute_read_one_query(user_q.FIND_BY_EMAIL, [body.email])
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    team_id = uuid.uuid4()
    await execute_insert_query(team_q.CREATE, [team_id, body.team_name])

    user_id = uuid.uuid4()
    user = await execute_insert_query(user_q.CREATE, [
        user_id, body.email, _hash_password(body.password), body.name, team_id
    ])

    token = _create_jwt(str(user_id), str(team_id), body.email, (user or {}).get("role") or "admin")

    response.set_cookie(
        key="alrt_token", value=token, httponly=True,
        secure=settings.cookie_secure, samesite="lax", max_age=JWT_EXPIRY_HOURS * 3600,
    )
    response.headers["Cache-Control"] = "no-store"

    return AuthResponse(user=user, team_id=team_id, token=token)


@router.post("/login", response_model=AuthResponse)
@limiter.limit(settings.rate_limit_auth)
async def login(request: Request, body: LoginRequest, response: Response):
    """Authenticate with email and password, then issue a JWT cookie.

    Updates the user's ``last_login_at`` timestamp on success.

    Raises:
        HTTPException: 401 for bad credentials, 403 if the account is disabled.
    """
    user = await execute_read_one_query(user_q.FIND_BY_EMAIL, [body.email])

    if not user or not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="Account disabled")

    await execute_update_query(user_q.UPDATE_LAST_LOGIN, [user["id"]])

    token = _create_jwt(str(user["id"]), str(user["team_id"]), user["email"], user.get("role") or "admin")

    response.set_cookie(
        key="alrt_token", value=token, httponly=True,
        secure=settings.cookie_secure, samesite="lax", max_age=JWT_EXPIRY_HOURS * 3600,
    )
    response.headers["Cache-Control"] = "no-store"

    return AuthResponse(user=user, team_id=user["team_id"], token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return user


@router.post("/logout")
async def logout(response: Response):
    """Clear the JWT cookie to end the dashboard session."""
    response.delete_cookie("alrt_token")
    return {"status": "ok"}
