import asyncio
import asyncpg
import logging
import os

logger = logging.getLogger("alrt.workers.db")

_pool: asyncpg.Pool | None = None


def _get_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://alrt:alrt@localhost:5432/alrt")
    return url.replace("postgresql+asyncpg://", "postgresql://")


async def _ensure_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        import json as _json

        async def _setup_conn(conn):
            await conn.set_type_codec("jsonb", encoder=_json.dumps, decoder=_json.loads, schema="pg_catalog")
            await conn.set_type_codec("json", encoder=_json.dumps, decoder=_json.loads, schema="pg_catalog")

        _pool = await asyncpg.create_pool(_get_database_url(), min_size=1, max_size=5, init=_setup_conn)
    return _pool


async def _read_one(query: str, params: list | None = None) -> dict | None:
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            row = await conn.fetchrow(query, *params)
        else:
            row = await conn.fetchrow(query)
        return dict(row) if row else None


async def _read(query: str, params: list | None = None) -> list[dict]:
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            rows = await conn.fetch(query, *params)
        else:
            rows = await conn.fetch(query)
        return [dict(r) for r in rows]


async def _insert(query: str, params: list | None = None) -> dict | None:
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            row = await conn.fetchrow(query, *params)
        else:
            row = await conn.fetchrow(query)
        return dict(row) if row else None


async def _update(query: str, params: list | None = None) -> bool:
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            await conn.execute(query, *params)
        else:
            await conn.execute(query)
        return True


def _run(coro):
    """Run an async coroutine from sync code (Celery worker context)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If there's already a running loop (unlikely in Celery), create a new one
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, coro)
                return future.result()
        else:
            return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


def execute_read_query(query: str, params: list | None = None) -> list[dict]:
    logger.debug(f"READ: {query[:80]}... params={params}")
    return _run(_read(query, params))


def execute_read_one_query(query: str, params: list | None = None) -> dict | None:
    logger.debug(f"READ_ONE: {query[:80]}... params={params}")
    return _run(_read_one(query, params))


def execute_insert_query(query: str, params: list | None = None) -> dict | None:
    logger.debug(f"INSERT: {query[:80]}... params={params}")
    return _run(_insert(query, params))


def execute_update_query(query: str, params: list | None = None) -> bool:
    logger.debug(f"UPDATE: {query[:80]}... params={params}")
    return _run(_update(query, params))
