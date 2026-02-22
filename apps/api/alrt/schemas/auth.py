import uuid
from datetime import datetime
from pydantic import BaseModel


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str | None = None
    team_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None
    avatar_url: str | None
    role: str
    team_id: uuid.UUID
    is_active: bool
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserResponse
    team_id: uuid.UUID
    token: str
