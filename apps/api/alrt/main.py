from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from alrt.config import settings
from alrt.routes import events, notifications, providers, subscribers, teams, workflows
from alrt_db.session import init_engine


@asynccontextmanager
async def lifespan(app):
    init_engine(settings.database_url)
    yield


app = FastAPI(title="Alrt API", version="0.1.0", lifespan=lifespan)

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


@app.get("/health")
async def health():
    return {"status": "ok"}
