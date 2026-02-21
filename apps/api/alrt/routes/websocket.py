import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from alrt.config import settings
from alrt.deps import get_db, get_current_team
from alrt.middleware.rate_limit import limiter
from alrt_db.models.subscriber import Subscriber
from alrt_db.models.notification import Notification
import alrt_db.session as db_session_mod

log = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

_JWT_ALGORITHM = "HS256"
_JWT_EXPIRY_HOURS = 24

# Active WebSocket connections: subscriber_id -> WebSocket
_connections: dict[str, WebSocket] = {}


@asynccontextmanager
async def _get_db_session():
    async with db_session_mod.async_session() as session:
        yield session


# ── Token Generation ──────────────────────────────────────

@router.post("/subscribers/{external_id}/token")
@limiter.limit(settings.rate_limit_write)
async def create_subscriber_token(
    request: Request,
    external_id: str,
    db: AsyncSession = Depends(get_db),
    team_id: uuid.UUID = Depends(get_current_team),
):
    result = await db.execute(
        select(Subscriber).where(
            Subscriber.team_id == team_id,
            Subscriber.external_id == external_id,
            Subscriber.is_deleted == False,
        )
    )
    subscriber = result.scalar_one_or_none()
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subscriber.id),
        "team_id": str(team_id),
        "scope": "subscriber",
        "iat": now,
        "exp": now + timedelta(hours=_JWT_EXPIRY_HOURS),
    }
    token = jwt.encode(payload, settings.api_secret_key, algorithm=_JWT_ALGORITHM)
    return {"token": token}


# ── WebSocket Helpers ─────────────────────────────────────

async def _validate_ws_token(token: str, db: AsyncSession) -> Subscriber:
    """Decode JWT and return the subscriber, or raise ValueError."""
    try:
        payload = jwt.decode(token, settings.api_secret_key, algorithms=[_JWT_ALGORITHM])
    except JWTError:
        raise ValueError("Invalid or expired token")

    if payload.get("scope") != "subscriber":
        raise ValueError("Invalid token scope")

    subscriber_id = payload.get("sub")
    if not subscriber_id:
        raise ValueError("Missing subscriber in token")

    result = await db.execute(
        select(Subscriber).where(
            Subscriber.id == uuid.UUID(subscriber_id),
            Subscriber.is_deleted == False,
        )
    )
    subscriber = result.scalar_one_or_none()
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
    async with _get_db_session() as db:
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
                    await db.execute(
                        update(Notification)
                        .where(
                            Notification.id == uuid.UUID(notification_id),
                            Notification.subscriber_id == uuid.UUID(subscriber_id),
                        )
                        .values(is_read=True)
                    )
                    await db.commit()
                    await ws.send_text(json.dumps({"type": "mark_read_ok", "notification_id": notification_id}))

            elif msg_type == "mark_all_read":
                await db.execute(
                    update(Notification)
                    .where(
                        Notification.subscriber_id == uuid.UUID(subscriber_id),
                        Notification.channel == "in_app",
                        Notification.is_read == False,
                    )
                    .values(is_read=True)
                )
                await db.commit()
                await ws.send_text(json.dumps({"type": "mark_all_read_ok"}))


# ── WebSocket Endpoint ────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    async with _get_db_session() as db:
        try:
            subscriber = await _validate_ws_token(token, db)
        except ValueError as e:
            await ws.close(code=4001, reason=str(e))
            return

        subscriber_id = str(subscriber.id)

    await ws.accept()

    # Close existing connection for this subscriber
    old_ws = _connections.pop(subscriber_id, None)
    if old_ws:
        try:
            await old_ws.close(code=4000, reason="New connection opened")
        except Exception:
            pass

    _connections[subscriber_id] = ws
    log.info(f"WebSocket connected: subscriber={subscriber_id}")

    listener_task = asyncio.create_task(_redis_listener(ws, subscriber_id))

    try:
        await _handle_client_messages(ws, subscriber_id)
    except WebSocketDisconnect:
        pass
    finally:
        listener_task.cancel()
        _connections.pop(subscriber_id, None)
        log.info(f"WebSocket disconnected: subscriber={subscriber_id}")
