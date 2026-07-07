"""Synchronous database helpers for Celery workers, backed by psycopg3.

Worker SQL is written with asyncpg-style ``$N`` placeholders. ``_prepare`` translates
them to psycopg3's ``%s`` (remapping the param list by ``$N`` appearance order, so
repeated/reordered placeholders bind correctly) and wraps dict/list params as JSONB.
A per-process ``ConnectionPool`` replaces the old asyncpg-behind-a-sync-shim, so there
is no event-loop juggling left.
"""

import logging
import os
import re

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

logger = logging.getLogger("alrt.workers.db")

_pool: ConnectionPool | None = None

# Matches $1, $2, ... (never $$ dollar-quotes — those have no digit after the $).
_PLACEHOLDER = re.compile(r"\$(\d+)")


def _get_database_url() -> str:
    """Read DATABASE_URL and normalize any SQLAlchemy driver suffix to a libpq URL."""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    return (
        url.replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgresql+psycopg://", "postgresql://")
    )


def _get_pool() -> ConnectionPool:
    """Lazily create the per-process pool (first use is post-fork under prefork).

    ``prepare_threshold=None`` disables server-side prepared statements so the pool
    is safe behind PgBouncer transaction mode; ``options`` applies the same
    statement/idle timeouts the API pool uses.
    """
    global _pool
    if _pool is None:
        stmt_ms = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "30000"))
        idle_ms = int(os.getenv("DB_IDLE_IN_TXN_TIMEOUT_MS", "10000"))
        options = f"-c statement_timeout={stmt_ms} -c idle_in_transaction_session_timeout={idle_ms}"
        _pool = ConnectionPool(
            conninfo=_get_database_url(),
            min_size=1,
            max_size=5,
            open=True,
            kwargs={"row_factory": dict_row, "prepare_threshold": None, "options": options},
        )
    return _pool


def _prepare(query: str, params: list | None):
    """Translate ``$N`` → ``%s`` and JSON-wrap dict/list params.

    Returns ``(sql, bound_params)``. ``bound_params`` is ``None`` when the query has
    no placeholders (psycopg3 then runs it raw, leaving any literal ``%`` alone).
    When placeholders exist, literal ``%`` is doubled for psycopg3's client-side
    binding. No worker query passes a Python list to a SQL array, so a dict/list
    param is always JSONB.
    """
    if not _PLACEHOLDER.search(query):
        return query, None

    src = params or []
    bound: list = []

    def repl(match):
        value = src[int(match.group(1)) - 1]
        bound.append(Jsonb(value) if isinstance(value, (dict, list)) else value)
        return "%s"

    translated = _PLACEHOLDER.sub(repl, query.replace("%", "%%"))
    return translated, bound


def _read_one(query: str, params: list | None = None) -> dict | None:
    sql, bound = _prepare(query, params)
    with _get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, bound)
        return cur.fetchone()


def _read(query: str, params: list | None = None) -> list[dict]:
    sql, bound = _prepare(query, params)
    with _get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, bound)
        return cur.fetchall()


def _insert(query: str, params: list | None = None) -> dict | None:
    """Run an INSERT ... RETURNING; returns the row, or None (e.g. ON CONFLICT DO NOTHING)."""
    sql, bound = _prepare(query, params)
    with _get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, bound)
        return cur.fetchone()


def _update(query: str, params: list | None = None) -> bool:
    """Run an UPDATE/DELETE; returns whether any row was affected."""
    sql, bound = _prepare(query, params)
    with _get_pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, bound)
        return cur.rowcount > 0


def execute_read_query(query: str, params: list | None = None) -> list[dict]:
    """Run a SELECT synchronously and return all matching rows as dicts."""
    logger.debug("READ: %s... params=%s", query[:80], params)
    return _read(query, params)


def execute_read_one_query(query: str, params: list | None = None) -> dict | None:
    """Run a SELECT synchronously and return the first row as a dict, or None."""
    logger.debug("READ_ONE: %s... params=%s", query[:80], params)
    return _read_one(query, params)


def execute_insert_query(query: str, params: list | None = None) -> dict | None:
    """Run an INSERT ... RETURNING synchronously and return the new row, or None."""
    logger.debug("INSERT: %s... params=%s", query[:80], params)
    return _insert(query, params)


def execute_update_query(query: str, params: list | None = None) -> bool:
    """Run an UPDATE/DELETE synchronously and return whether rows were affected."""
    logger.debug("UPDATE: %s... params=%s", query[:80], params)
    return _update(query, params)
