import uuid

from jinja2 import Environment, Undefined
from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_read_one_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import subscribers as sub_q
from alrt.schemas.preview import PreviewRequest, PreviewResponse

router = APIRouter(prefix="/templates", tags=["templates"])

_env = Environment(undefined=Undefined, autoescape=False)


@router.post("/preview", response_model=PreviewResponse)
@limiter.limit(settings.rate_limit_write)
async def preview_template(
    request: Request,
    body: PreviewRequest,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = None
    if body.subscriber_id:
        row = await execute_read_one_query(sub_q.FIND_BY_EXTERNAL_ID, [team_id, body.subscriber_id])
        if not row:
            raise HTTPException(status_code=404, detail="Subscriber not found")
        subscriber = {**row, "properties": row.get("custom_properties", {})}

    ctx = {"payload": body.payload}
    if subscriber:
        ctx["subscriber"] = subscriber

    try:
        rendered = _env.from_string(body.template).render(**ctx)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Template render error: {exc}")

    return PreviewResponse(rendered=rendered)
