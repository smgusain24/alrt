"""Synchronous database helpers for Celery workers backed by an asyncpg pool."""

import asyncio
import asyncpg
import logging
import os

logger = logging.getLogger("alrt.workers.db")

_pool: asyncpg.Pool | None = None


def _get_database_url() -> str:
    """Read DATABASE_URL from environment and normalize to asyncpg format."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    return url.replace("postgresql+asyncpg://", "postgresql://")


async def _ensure_pool() -> asyncpg.Pool:
    """Lazily create and return the module-level asyncpg connection pool.

    Returns:
        The shared asyncpg connection pool with JSON/JSONB codecs configured.
    """
    global _pool
    if _pool is None:
        import json as _json

        async def _setup_conn(conn):
            await conn.set_type_codec("jsonb", encoder=_json.dumps, decoder=_json.loads, schema="pg_catalog")
            await conn.set_type_codec("json", encoder=_json.dumps, decoder=_json.loads, schema="pg_catalog")

        _pool = await asyncpg.create_pool(_get_database_url(), min_size=1, max_size=5, init=_setup_conn)
    return _pool


async def _read_one(query: str, params: list | None = None) -> dict | None:
    """Execute a SELECT query and return the first row as a dict, or None.

    Args:
        query: SQL query string with $1-style placeholders.
        params: Positional parameters for the query.

    Returns:
        A dict of column-value pairs, or None if no rows matched.
    """
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            row = await conn.fetchrow(query, *params)
        else:
            row = await conn.fetchrow(query)
        return dict(row) if row else None


async def _read(query: str, params: list | None = None) -> list[dict]:
    """Execute a SELECT query and return all rows as a list of dicts.

    Args:
        query: SQL query string with $1-style placeholders.
        params: Positional parameters for the query.

    Returns:
        A list of dicts, one per row. Empty list if no rows matched.
    """
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            rows = await conn.fetch(query, *params)
        else:
            rows = await conn.fetch(query)
        return [dict(r) for r in rows]


async def _insert(query: str, params: list | None = None) -> dict | None:
    """Execute an INSERT ... RETURNING query and return the inserted row.

    Args:
        query: SQL INSERT query with a RETURNING clause.
        params: Positional parameters for the query.

    Returns:
        A dict of the returned row, or None if nothing was returned.
    """
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            row = await conn.fetchrow(query, *params)
        else:
            row = await conn.fetchrow(query)
        return dict(row) if row else None


async def _update(query: str, params: list | None = None) -> bool:
    """Execute an UPDATE query and return whether any rows were affected.

    Args:
        query: SQL UPDATE query string.
        params: Positional parameters for the query.

    Returns:
        True if at least one row was updated, False otherwise.
    """
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        if params:
            result = await conn.execute(query, *params)
        else:
            result = await conn.execute(query)
        # asyncpg returns e.g. "UPDATE 1" or "UPDATE 0"
        return result != "UPDATE 0"


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
    """Run a SELECT query synchronously and return all matching rows.

    Args:
        query: SQL query string with $1-style placeholders.
        params: Positional parameters for the query.

    Returns:
        A list of dicts, one per row.
    """
    logger.debug("READ: %s... params=%s", query[:80], params)
    return _run(_read(query, params))


def execute_read_one_query(query: str, params: list | None = None) -> dict | None:
    """Run a SELECT query synchronously and return the first row or None.

    Args:
        query: SQL query string with $1-style placeholders.
        params: Positional parameters for the query.

    Returns:
        A dict of column-value pairs, or None if no rows matched.
    """
    logger.debug("READ_ONE: %s... params=%s", query[:80], params)
    return _run(_read_one(query, params))


def execute_insert_query(query: str, params: list | None = None) -> dict | None:
    """Run an INSERT ... RETURNING query synchronously and return the new row.

    Args:
        query: SQL INSERT query with a RETURNING clause.
        params: Positional parameters for the query.

    Returns:
        A dict of the returned row, or None if nothing was returned.
    """
    logger.debug("INSERT: %s... params=%s", query[:80], params)
    return _run(_insert(query, params))


def execute_update_query(query: str, params: list | None = None) -> bool:
    """Run an UPDATE query synchronously and return whether rows were affected.

    Args:
        query: SQL UPDATE query string.
        params: Positional parameters for the query.

    Returns:
        True if at least one row was updated, False otherwise.
    """
    logger.debug("UPDATE: %s... params=%s", query[:80], params)
    return _run(_update(query, params))
