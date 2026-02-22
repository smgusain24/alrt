import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from alrt.config import settings
from alrt.db import execute_read_query, execute_read_one_query, execute_insert_query, execute_delete_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import workflows as wf_q
from alrt.schemas.workflow import CreateWorkflow, UpdateWorkflow, WorkflowResponse

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowResponse, status_code=201)
@limiter.limit(settings.rate_limit_write)
async def create_workflow(
    request: Request,
    body: CreateWorkflow,
    team_id: uuid.UUID = Depends(get_current_team),
):
    existing = await execute_read_one_query(wf_q.FIND_BY_EVENT_NAME, [team_id, body.event_name])
    if existing:
        raise HTTPException(status_code=409, detail="Event name already in use")

    row = await execute_insert_query(
        wf_q.CREATE,
        [
            uuid.uuid4(),
            team_id,
            body.name,
            body.event_name,
            body.definition if body.definition is not None else {},
        ],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to create workflow")
    return WorkflowResponse.model_validate(row)


@router.get("", response_model=list[WorkflowResponse])
@limiter.limit(settings.rate_limit_read)
async def list_workflows(
    request: Request,
    team_id: uuid.UUID = Depends(get_current_team),
):
    rows = await execute_read_query(wf_q.LIST_BY_TEAM, [team_id])
    return [WorkflowResponse.model_validate(r) for r in rows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
@limiter.limit(settings.rate_limit_read)
async def get_workflow(
    request: Request,
    workflow_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    workflow = await execute_read_one_query(wf_q.FIND_BY_ID, [workflow_id, team_id])
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse.model_validate(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
@limiter.limit(settings.rate_limit_write)
async def update_workflow(
    request: Request,
    workflow_id: uuid.UUID,
    body: UpdateWorkflow,
    team_id: uuid.UUID = Depends(get_current_team),
):
    workflow = await execute_read_one_query(wf_q.FIND_BY_ID, [workflow_id, team_id])
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    updates = body.model_dump(exclude_unset=True)

    # COALESCE pattern: pass None for unchanged fields so DB keeps existing value
    row = await execute_insert_query(
        wf_q.UPDATE,
        [
            workflow_id,
            team_id,
            updates.get("name"),
            updates.get("event_name"),
            updates["definition"] if "definition" in updates else None,
        ],
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to update workflow")
    return WorkflowResponse.model_validate(row)


@router.post("/{workflow_id}/publish", response_model=WorkflowResponse)
@limiter.limit(settings.rate_limit_write)
async def publish_workflow(
    request: Request,
    workflow_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    workflow = await execute_read_one_query(wf_q.FIND_BY_ID, [workflow_id, team_id])
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    definition = workflow["definition"] or {}
    nodes = definition.get("nodes", [])

    if not nodes:
        raise HTTPException(status_code=400, detail="Workflow must have at least one node")

    trigger_nodes = [n for n in nodes if n.get("type") == "trigger"]
    if not trigger_nodes:
        raise HTTPException(status_code=400, detail="Workflow must have a trigger node")

    if len(nodes) > 10:
        raise HTTPException(status_code=400, detail="Workflow cannot exceed 10 steps")

    row = await execute_insert_query(wf_q.PUBLISH, [workflow_id, team_id])
    if not row:
        raise HTTPException(status_code=500, detail="Failed to publish workflow")
    return WorkflowResponse.model_validate(row)


@router.delete("/{workflow_id}", status_code=204)
@limiter.limit(settings.rate_limit_write)
async def delete_workflow(
    request: Request,
    workflow_id: uuid.UUID,
    team_id: uuid.UUID = Depends(get_current_team),
):
    workflow = await execute_read_one_query(wf_q.FIND_BY_ID, [workflow_id, team_id])
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    await execute_delete_query(wf_q.DELETE, [workflow_id, team_id])
