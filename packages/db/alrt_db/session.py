from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

engine = None
async_session = None

sync_engine = None
sync_session = None


def init_engine(database_url):
    global engine, async_session
    engine = create_async_engine(database_url, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_session():
    async with async_session() as session:
        yield session


def init_sync_engine(database_url):
    # Convert async URL to sync (asyncpg -> psycopg2)
    global sync_engine, sync_session
    sync_url = database_url.replace("+asyncpg", "")
    sync_engine = create_engine(sync_url, echo=False)
    sync_session = sessionmaker(sync_engine, expire_on_commit=False)
