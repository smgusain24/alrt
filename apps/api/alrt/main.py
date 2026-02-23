from contextlib import asynccontextmanager

from fastapi import FastAPI, Request  # noqa: F401 — Request needed for rate-limited health endpoint
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from alrt.config import settings
from alrt.db import init_pool, close_pool, ensure_schema
from alrt.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from alrt.middleware.audit_log import AuditLogMiddleware
from alrt.routes import analytics, auth, events, logs, notifications, providers, subscribers, teams, templates, websocket, workflows


@asynccontextmanager
async def lifespan(app):
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
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


@app.get("/health")
@limiter.limit(settings.rate_limit_public)
async def health(request: Request):
    return {"status": "ok"}
