import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from alrt.deps import get_db, get_current_team
from alrt.schemas.workflow import CreateWorkflow, UpdateWorkflow, WorkflowResponse
from alrt_db.models.workflow import Workflow

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    body: CreateWorkflow,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Workflow).where(
            Workflow.team_id == team_id,
            Workflow.event_name == body.event_name,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Event name already in use")

    workflow = Workflow(
        team_id=team_id,
        name=body.name,
        event_name=body.event_name,
        definition=body.definition,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return WorkflowResponse.model_validate(workflow)


@router.get("", response_model=list[WorkflowResponse])
async def list_workflows(
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Workflow).where(Workflow.team_id == team_id)
    )
    return [WorkflowResponse.model_validate(w) for w in result.scalars().all()]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.team_id == team_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse.model_validate(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: uuid.UUID,
    body: UpdateWorkflow,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.team_id == team_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if workflow.status == "published":
        raise HTTPException(status_code=400, detail="Cannot edit a published workflow")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(workflow, field, value)

    await db.commit()
    await db.refresh(workflow)
    return WorkflowResponse.model_validate(workflow)


@router.post("/{workflow_id}/publish", response_model=WorkflowResponse)
async def publish_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.team_id == team_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    definition = workflow.definition or {}
    nodes = definition.get("nodes", [])

    if not nodes:
        raise HTTPException(status_code=400, detail="Workflow must have at least one node")

    trigger_nodes = [n for n in nodes if n.get("type") == "trigger"]
    if not trigger_nodes:
        raise HTTPException(status_code=400, detail="Workflow must have a trigger node")

    if len(nodes) > 10:
        raise HTTPException(status_code=400, detail="Workflow cannot exceed 10 steps")

    workflow.status = "published"
    await db.commit()
    await db.refresh(workflow)
    return WorkflowResponse.model_validate(workflow)


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.team_id == team_id)
    )
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    await db.delete(workflow)
    await db.commit()
