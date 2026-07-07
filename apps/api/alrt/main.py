"""Alrt API application entry point.

Creates the FastAPI app, registers middleware (CORS, rate limiting, audit
logging), mounts all route modules, and defines the lifespan that
initializes the database pool and schema on startup.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request  # noqa: F401 — Request needed for rate-limited health endpoint
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from alrt.config import settings
from alrt.db import init_pool, close_pool, ensure_schema
from alrt.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from alrt.middleware.audit_log import AuditLogMiddleware
from alrt.middleware.request_id import RequestIdMiddleware
from alrt.middleware.security_headers import SecurityHeadersMiddleware
from alrt.routes import activity, analytics, auth, channels, events, invites, logs, notifications, providers, push_tokens, subscribers, teams, templates, websocket, workflows

logger = logging.getLogger("alrt.main")


def _init_sentry():
    """Initialize Sentry if a DSN is configured. No-op (and dependency-free) otherwise."""
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)
        logger.info("Sentry initialized")
    except ImportError:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed")


@asynccontextmanager
async def lifespan(app):
    """Manage startup and shutdown of shared resources.

    On startup, initializes the asyncpg connection pool and ensures the
    database schema is up to date. On shutdown, closes the pool.
    """
    _init_sentry()
    await init_pool(settings.database_url)
    await ensure_schema()
    yield
    await close_pool()


app = FastAPI(title="Alrt API", version="0.1.0", lifespan=lifespan)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(AuditLogMiddleware)

# Security headers on every response (CSP/HSTS/nosniff/frame-ancestors).
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added last so it is the outermost layer — every request gets a correlation id
# before any other middleware or handler runs.
app.add_middleware(RequestIdMiddleware)

app.include_router(auth.router)
app.include_router(channels.router)
app.include_router(teams.router)
app.include_router(subscribers.router)
app.include_router(workflows.router)
app.include_router(notifications.router)
app.include_router(events.router)
app.include_router(providers.router)
app.include_router(websocket.router)
app.include_router(templates.router)
app.include_router(analytics.router)
app.include_router(logs.router)
app.include_router(activity.router)
app.include_router(invites.router)
app.include_router(push_tokens.router)


@app.get("/health")
@limiter.limit(settings.rate_limit_public)
async def health(request: Request):
    """Return a simple liveness check response."""
    return {"status": "ok"}
