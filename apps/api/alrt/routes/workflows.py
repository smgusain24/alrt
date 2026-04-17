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


def _validate_workflow_graph(definition: dict) -> list[str]:
    """Validate workflow graph structure. Returns list of error strings (empty = valid)."""
    errors = []
    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])

    if not nodes:
        errors.append("Workflow must have at least one node")
        return errors

    node_ids = {n["id"] for n in nodes if "id" in n}
    node_map = {n["id"]: n for n in nodes if "id" in n}

    # 1. Exactly one trigger node
    trigger_nodes = [n for n in nodes if n.get("type") == "trigger"]
    if len(trigger_nodes) == 0:
        errors.append("Workflow must have a trigger node")
    elif len(trigger_nodes) > 1:
        errors.append(f"Workflow must have exactly one trigger node, found {len(trigger_nodes)}")

    # 2. No dangling edges
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src not in node_ids:
            errors.append(f"Edge references non-existent source node '{src}'")
        if tgt not in node_ids:
            errors.append(f"Edge references non-existent target node '{tgt}'")

    # Build adjacency list for graph traversal
    children_map: dict[str, list[str]] = {}
    for edge in edges:
        src = edge.get("source")
        if src and src in node_ids:
            children_map.setdefault(src, []).append(edge.get("target"))

    # 3. Cycle detection (DFS)
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in node_ids}

    def has_cycle(nid: str) -> bool:
        color[nid] = GRAY
        for child in children_map.get(nid, []):
            if child not in color:
                continue
            if color[child] == GRAY:
                return True
            if color[child] == WHITE and has_cycle(child):
                return True
        color[nid] = BLACK
        return False

    for nid in node_ids:
        if color[nid] == WHITE:
            if has_cycle(nid):
                errors.append("Workflow contains a cycle")
                break

    # 4. Orphan nodes (not reachable from trigger)
    if trigger_nodes:
        trigger_id = trigger_nodes[0]["id"]
        reachable = set()
        stack = [trigger_id]
        while stack:
            curr = stack.pop()
            if curr in reachable:
                continue
            reachable.add(curr)
            stack.extend(children_map.get(curr, []))

        orphans = node_ids - reachable
        for orphan_id in orphans:
            node = node_map.get(orphan_id)
            node_type = node.get("type", "unknown") if node else "unknown"
            errors.append(f"Node '{orphan_id}' ({node_type}) is not reachable from the trigger")

    # 5. Required data fields per node type
    for node in nodes:
        ntype = node.get("type")
        data = node.get("data", {})
        nid = node.get("id", "?")

        if ntype == "channel" and not data.get("channel"):
            errors.append(f"Channel node '{nid}' is missing required 'channel' field")
        if ntype == "condition" and not data.get("field"):
            errors.append(f"Condition node '{nid}' is missing required 'field' field")
        if ntype == "delay" and not data.get("duration_seconds"):
            errors.append(f"Delay node '{nid}' is missing required 'duration_seconds' field")

    return errors


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

    if len(nodes) > 10:
        raise HTTPException(status_code=400, detail="Workflow cannot exceed 10 steps")

    validation_errors = _validate_workflow_graph(definition)
    if validation_errors:
        raise HTTPException(status_code=422, detail=validation_errors)

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
