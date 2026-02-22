from __future__ import annotations

import hashlib

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from alrt.config import settings


def _get_api_key_or_ip(request: Request) -> str:
    """Return a rate-limit bucket key.

    Uses the SHA-256 hash of the Bearer token when present, otherwise
    falls back to the caller's IP address.
    """
    authorization: str | None = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):]
        return hashlib.sha256(token.encode()).hexdigest()
    return request.client.host if request.client else "anonymous"


limiter = Limiter(
    key_func=_get_api_key_or_ip,
    storage_uri=settings.redis_url,
    strategy="fixed-window",
    enabled=True,
)


def rate_limit_exceeded_handler(
    request: Request, exc: Exception  # noqa: ARG001
) -> JSONResponse:
    """Return a 429 JSON response with Retry-After header."""
    retry_after: int = int(getattr(exc, "retry_after", 60))
    detail = str(getattr(exc, "detail", "Rate limit exceeded"))
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": detail,
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )
