import uuid

from jinja2 import Environment, Undefined
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from alrt.config import settings
from alrt.db import (
    execute_read_query,
    execute_read_one_query,
    execute_insert_query,
    execute_delete_query,
)
from alrt.deps import get_current_team, require_write
from alrt.middleware.rate_limit import limiter
from alrt.queries import templates as tmpl_q, subscribers as sub_q
from alrt.schemas.template import (
    CreateTemplate,
    UpdateTemplate,
    TemplateResponse,
    TemplateListResponse,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
)
from alrt.schemas.preview import PreviewRequest, PreviewResponse

router = APIRouter(prefix="/templates", tags=["templates"])

_env = Environment(undefined=Undefined, autoescape=False)


@router.post("", response_model=TemplateResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_template(
    request: Request,
    body: CreateTemplate,
    team_id: uuid.UUID = Depends(get_current_team),
    _: dict = Depends(require_write),
):
    row = await execute_insert_query(
        tmpl_q.CREATE,
        [uuid.uuid4(), team_id, body.name, body.channel,
         body.subject, body.body, body.variables, "draft"],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create template")
    return TemplateResponse.model_validate(row)


@router.get("", response_model=TemplateListResponse)
@limiter.limit(settings.rate_limit_read)
async def list_templates(
    request: Request,
    channel: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    team_id: uuid.UUID = Depends(get_current_team),
):
    rows = await execute_read_query(
        tmpl_q.LIST_BY_TEAM, [team_id, channel, status, limit, offset]
    )
    count_row = await execute_read_one_query(
        tmpl_q.COUNT_BY_TEAM, [team_id, channel, status]
    )
    total = count_row["total"] if count_row else 0
    return TemplateListResponse(
        items=[TemplateResponse.model_validate(r) for r in rows],
        total=total,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
@limiter.limit(settings.rate_limit_read)
async def get_template(
    request: Request,
    template_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    row = await execute_read_one_query(tmpl_q.FIND_BY_ID, [template_id, team_id])
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse.model_validate(row)


@router.put("/{template_id}", response_model=TemplateResponse)
@limiter.limit(settings.rate_limit_write)
async def update_template(
    request: Request,
    template_id: uuid.UUID,
    body: UpdateTemplate,
    team_id: uuid.UUID = Depends(get_current_team),
    _: dict = Depends(require_write),
):
    existing = await execute_read_one_query(tmpl_q.FIND_BY_ID, [template_id, team_id])
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")

    row = await execute_insert_query(
        tmpl_q.UPDATE,
        [template_id, team_id, body.name, body.channel,
         body.subject if body.subject is not None else existing["subject"],
         body.body, body.variables, body.status],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to update template")
    return TemplateResponse.model_validate(row)


@router.delete("/{template_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_template(
    request: Request,
    template_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
    _: dict = Depends(require_write),
):
    existing = await execute_read_one_query(tmpl_q.FIND_BY_ID, [template_id, team_id])
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    await execute_delete_query(tmpl_q.DELETE, [template_id, team_id])


@router.post("/{template_id}/preview", response_model=TemplatePreviewResponse)
@limiter.limit(settings.rate_limit_write)
async def preview_template_by_id(
    request: Request,
    template_id: uuid.UUID,
    body: TemplatePreviewRequest,
    team_id: uuid.UUID = Depends(get_current_team),
):
    template = await execute_read_one_query(tmpl_q.FIND_BY_ID, [template_id, team_id])
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

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
        rendered_body = _env.from_string(template["body"]).render(**ctx)
        rendered_subject = None
        if template["subject"]:
            rendered_subject = _env.from_string(template["subject"]).render(**ctx)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Template render error: {exc}")

    return TemplatePreviewResponse(subject=rendered_subject, body=rendered_body)


# Legacy inline preview endpoint (backward compatible)
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
