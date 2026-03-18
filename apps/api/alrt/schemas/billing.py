import uuid
from datetime import datetime
from pydantic import BaseModel


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    price_inr: int
    quota_limit: int
    features: dict

    model_config = {"from_attributes": True}


class SubscribeRequest(BaseModel):
    plan_id: uuid.UUID


class SubscribeResponse(BaseModel):
    subscription_id: str
    checkout_url: str


class BillingCurrentResponse(BaseModel):
    plan_name: str | None
    plan_display_name: str | None
    price_inr: int | None
    billing_status: str
    quota_used: int
    quota_limit: int | None
    trial_ends_at: datetime | None
    period_ends_at: datetime | None
    subscription_id: str | None

    model_config = {"from_attributes": True}


class CancelResponse(BaseModel):
    status: str
