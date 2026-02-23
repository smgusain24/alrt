from pydantic import BaseModel


class PreviewRequest(BaseModel):
    template: str
    payload: dict = {}
    subscriber_id: str | None = None


class PreviewResponse(BaseModel):
    rendered: str
