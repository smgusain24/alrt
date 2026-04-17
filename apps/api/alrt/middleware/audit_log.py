"""Request audit logging middleware.

Records every API request (except health, docs, and WebSocket paths) into
the ``event_logs`` table.  Logging is fire-and-forget so it never blocks
the response.  Sensitive fields in request bodies are scrubbed before
storage.
"""

import asyncio
import hashlib
import json
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response as StarletteResponse

from alrt.config import settings
from alrt.db import get_pool

logger = logging.getLogger("alrt.audit")

SKIP_PATHS = {"/health", "/docs", "/openapi.json"}
SKIP_PREFIXES = ("/ws",)
MAX_BODY_SIZE = 10 * 1024  # 10KB


def _extract_team_id_from_jwt(request: Request):
    """Best-effort team_id extraction from JWT. Returns UUID or None."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None

    token = auth[7:]

    try:
        from jose import jwt
        payload = jwt.decode(token, settings.api_secret_key, algorithms=["HS256"])
        team_id = payload.get("team_id")
        if team_id:
            return uuid.UUID(team_id)
    except Exception:
        pass

    return None


async def _extract_team_id_from_api_key(request: Request):
    """Best-effort team_id extraction from API key. Returns UUID or None."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None

    raw_key = auth[7:]
    if not raw_key.startswith("alrt_"):
        return None

    try:
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT team_id FROM api_keys WHERE key_hash = $1 AND is_active = true",
                key_hash,
            )
            if row:
                return row["team_id"]
    except Exception:
        pass

    return None


async def _log_request(team_id, method, path, status_code, latency_ms, body, response_summary, ip, user_agent):
    """Insert a single audit row into ``event_logs``.

    Silently swallows errors so a logging failure never surfaces to callers.
    """
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """INSERT INTO event_logs (team_id, method, path, status_code, latency_ms, request_body, response_summary, ip_address, user_agent)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
                team_id, method, path, status_code, latency_ms, body, response_summary, ip, user_agent,
            )
    except AssertionError:
        # Pool not initialized yet (startup)
        pass
    except Exception as e:
        logger.warning("Failed to write audit log: %s", e)


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Starlette middleware that writes per-request audit logs.

    For each non-skipped request, captures method, path, latency, request
    body (for mutating methods), and a response body snippet for non-2xx
    responses.  The log write is dispatched as an ``asyncio.Task`` so it
    does not add latency to the response.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip non-API paths
        if path in SKIP_PATHS or any(path.startswith(p) for p in SKIP_PREFIXES):
            return await call_next(request)

        method = request.method
        ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")[:500]

        # Capture request body for mutating methods
        body = None
        if method in ("POST", "PUT", "PATCH"):
            try:
                raw = await request.body()
                if len(raw) <= MAX_BODY_SIZE:
                    body = json.loads(raw)
                    # Scrub sensitive fields
                    for key in ("password", "password_hash", "secret", "token"):
                        if key in body:
                            body[key] = "***"
                else:
                    body = {"_truncated": True, "_size": len(raw)}
            except Exception:
                body = None

        start = time.time()
        response = await call_next(request)
        latency_ms = int((time.time() - start) * 1000)

        # Capture response body snippet for non-2xx responses
        response_summary = None
        if response.status_code >= 300:
            try:
                chunks = []
                async for chunk in response.body_iterator:
                    chunks.append(chunk if isinstance(chunk, bytes) else chunk.encode())
                response_body = b"".join(chunks)
                snippet = response_body[:1024].decode("utf-8", errors="replace")
                try:
                    response_summary = json.loads(snippet)
                except (json.JSONDecodeError, ValueError):
                    response_summary = {"raw": snippet}
                # Rebuild response so the client still gets the body
                headers = {k: v for k, v in response.headers.items() if k.lower() != "content-length"}
                response = StarletteResponse(
                    content=response_body,
                    status_code=response.status_code,
                    headers=headers,
                    media_type=response.media_type,
                )
            except Exception:
                response_summary = None

        # Best-effort team_id: try JWT first, then API key
        team_id = _extract_team_id_from_jwt(request)
        if not team_id:
            try:
                team_id = await _extract_team_id_from_api_key(request)
            except Exception:
                pass

        # Fire-and-forget — don't block the response; log all requests
        asyncio.create_task(
            _log_request(team_id, method, path, response.status_code, latency_ms, body, response_summary, ip, user_agent)
        )

        return response
