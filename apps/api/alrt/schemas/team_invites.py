import uuid
from datetime import datetime
from pydantic import BaseModel


class CreateInviteRequest(BaseModel):
    email: str
    role: str = "viewer"  # "admin" or "viewer"


class InviteResponse(BaseModel):
    id: uuid.UUID
    team_id: uuid.UUID
    email: str
    role: str
    expires_at: datetime
    created_at: datetime
    invite_url: str  # copy-link for dashboard display


class AcceptInviteRequest(BaseModel):
    token: str
    password: str
    name: str | None = None


class MemberRecord(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None = None
    role: str
    created_at: datetime
    last_login_at: datetime | None = None
    record_type: str  # "member" or "invite"


class MembersListResponse(BaseModel):
    members: list[MemberRecord]
