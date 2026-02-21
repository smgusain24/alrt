from contextlib import asynccontextmanager

from fastapi import FastAPI, Request  # noqa: F401 — Request needed for rate-limited health endpoint
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from alrt.config import settings
from alrt.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from alrt.routes import events, notifications, providers, subscribers, teams, websocket, workflows
from alrt_db.session import init_engine, engine as _engine_ref
from alrt_db.base import Base
import alrt_db.models  # noqa: F401 – register all models on metadata
import alrt_db.session as db_session_mod


@asynccontextmanager
async def lifespan(app):
    init_engine(settings.database_url)
    async with db_session_mod.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Alrt API", version="0.1.0", lifespan=lifespan)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(teams.router)
app.include_router(subscribers.router)
app.include_router(workflows.router)
app.include_router(notifications.router)
app.include_router(events.router)
app.include_router(providers.router)
app.include_router(websocket.router)


@app.get("/health")
@limiter.limit(settings.rate_limit_public)
async def health(request: Request):
    return {"status": "ok"}
