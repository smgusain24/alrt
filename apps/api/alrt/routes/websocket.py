import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
import redis.asyncio as aioredis

from alrt.config import settings
from alrt.db import execute_read_one_query, execute_update_query
from alrt.deps import get_current_team
from alrt.middleware.rate_limit import limiter
from alrt.queries import subscribers as sub_q, notifications as notif_q

log = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

_JWT_ALGORITHM = "HS256"
_JWT_EXPIRY_HOURS = 24

# Active WebSocket connections: subscriber_id -> WebSocket
_connections: dict[str, WebSocket] = {}


# ── Token Generation ──────────────────────────────────────

@router.post("/subscribers/{external_id}/token")
@limiter.limit(settings.rate_limit_write)
async def create_subscriber_token(
    request: Request,
    external_id: str,
    team_id: uuid.UUID = Depends(get_current_team),
):
    subscriber = await execute_read_one_query(
        sub_q.FIND_BY_EXTERNAL_ID, [team_id, external_id]
    )
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subscriber["id"]),
        "team_id": str(team_id),
        "scope": "subscriber",
        "iat": now,
        "exp": now + timedelta(hours=_JWT_EXPIRY_HOURS),
    }
    token = jwt.encode(payload, settings.api_secret_key, algorithm=_JWT_ALGORITHM)
    return {"token": token}


# ── WebSocket Helpers ─────────────────────────────────────

async def _validate_ws_token(token: str) -> dict:
    """Decode JWT and return the subscriber dict, or raise ValueError."""
    try:
        payload = jwt.decode(token, settings.api_secret_key, algorithms=[_JWT_ALGORITHM])
    except JWTError:
        raise ValueError("Invalid or expired token")

    if payload.get("scope") != "subscriber":
        raise ValueError("Invalid token scope")

    subscriber_id = payload.get("sub")
    if not subscriber_id:
        raise ValueError("Missing subscriber in token")

    subscriber = await execute_read_one_query(
        sub_q.FIND_BY_ID, [uuid.UUID(subscriber_id)]
    )
    if not subscriber:
        raise ValueError("Subscriber not found")

    return subscriber


async def _redis_listener(ws: WebSocket, subscriber_id: str):
    """Subscribe to Redis Pub/Sub and forward messages to WebSocket."""
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"subscriber:{subscriber_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await ws.send_text(message["data"].decode())
    finally:
        await pubsub.unsubscribe(f"subscriber:{subscriber_id}")
        await pubsub.close()
        await r.close()


async def _handle_client_messages(ws: WebSocket, subscriber_id: str):
    """Receive messages from WebSocket client and handle them."""
    async for raw in ws.iter_text():
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            await ws.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
            continue

        msg_type = msg.get("type")

        if msg_type == "ping":
            await ws.send_text(json.dumps({"type": "pong"}))

        elif msg_type == "mark_read":
            notification_id = msg.get("notification_id")
            if notification_id:
                await execute_update_query(
                    notif_q.UPDATE_READ_STATUS,
                    [uuid.UUID(notification_id), True, uuid.UUID(subscriber_id)],
                )
                await ws.send_text(json.dumps({"type": "mark_read_ok", "notification_id": notification_id}))

        elif msg_type == "mark_all_read":
            await execute_update_query(
                notif_q.MARK_ALL_READ,
                [uuid.UUID(subscriber_id)],
            )
            await ws.send_text(json.dumps({"type": "mark_all_read_ok"}))


# ── WebSocket Endpoint ────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    try:
        subscriber = await _validate_ws_token(token)
    except ValueError as e:
        await ws.close(code=4001, reason=str(e))
        return

    subscriber_id = str(subscriber["id"])

    await ws.accept()

    # Close existing connection for this subscriber
    old_ws = _connections.pop(subscriber_id, None)
    if old_ws:
        try:
            await old_ws.close(code=4000, reason="New connection opened")
        except Exception:
            pass

    _connections[subscriber_id] = ws
    log.info("WebSocket connected: subscriber=%s", subscriber_id)

    listener_task = asyncio.create_task(_redis_listener(ws, subscriber_id))

    try:
        await _handle_client_messages(ws, subscriber_id)
    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        _connections.pop(subscriber_id, None)
        log.info("WebSocket disconnected: subscriber=%s", subscriber_id)
