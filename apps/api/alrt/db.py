import asyncpg
import logging

logger = logging.getLogger("alrt.db")

_pool: asyncpg.Pool | None = None


async def _setup_connection(conn):
    """Set up JSONB codec so asyncpg auto-serializes dicts to/from JSONB."""
    import json
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )
    await conn.set_type_codec(
        "json",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
    )


async def init_pool(database_url: str):
    """Initialize the asyncpg connection pool. Call once at startup."""
    global _pool
    # Convert SQLAlchemy-style URL to asyncpg format
    url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    _pool = await asyncpg.create_pool(url, min_size=2, max_size=10, init=_setup_connection)
    logger.info("Database pool initialized")


REQUIRED_TABLES = [
    "teams", "users", "api_keys", "subscribers", "workflows",
    "workflow_executions", "notifications", "providers", "scheduled_steps",
    "event_logs",
]

REQUIRED_INDEXES = [
    ("idx_api_keys_key_hash", "api_keys", "key_hash"),
    ("idx_api_keys_team_id", "api_keys", "team_id"),
    ("idx_subscribers_team_external", "subscribers", "team_id, external_id"),
    ("idx_subscribers_team_id", "subscribers", "team_id"),
    ("idx_workflows_team_id", "workflows", "team_id"),
    ("idx_workflows_team_event", "workflows", "team_id, event_name"),
    ("idx_executions_team_id", "workflow_executions", "team_id"),
    ("idx_notifications_subscriber", "notifications", "subscriber_id, team_id"),
    ("idx_notifications_read", "notifications", "subscriber_id, is_read"),
    ("idx_providers_team_id", "providers", "team_id"),
    ("idx_providers_team_channel", "providers", "team_id, channel"),
    ("idx_scheduled_steps_due", "scheduled_steps", "status, scheduled_at"),
    ("idx_users_email", "users", "email"),
    ("idx_users_team_id", "users", "team_id"),
    ("idx_event_logs_team_id", "event_logs", "team_id"),
    ("idx_event_logs_created_at", "event_logs", "team_id, created_at DESC"),
    ("idx_notifications_status", "notifications", "team_id, status"),
]

SCHEMA_SQL = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    team_id UUID NOT NULL REFERENCES teams(id),
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    key_hash VARCHAR(64) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    key_type VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    name VARCHAR(100),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    external_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    slack_user_id VARCHAR(255),
    custom_properties JSONB NOT NULL DEFAULT '{}',
    channel_preferences JSONB NOT NULL DEFAULT '{}',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, external_id)
);

CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    name VARCHAR(255) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    definition JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, event_name)
);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id),
    event_payload JSONB NOT NULL DEFAULT '{}',
    channels JSONB,
    overrides JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id),
    workflow_id UUID REFERENCES workflows(id),
    workflow_execution_id UUID REFERENCES workflow_executions(id),
    channel VARCHAR(20) NOT NULL,
    title VARCHAR(500),
    body TEXT,
    action_url VARCHAR(2048),
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_reason TEXT,
    sent_at TIMESTAMPTZ,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    channel VARCHAR(20) NOT NULL,
    provider_type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id),
    next_step_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    status_code INTEGER,
    latency_ms INTEGER,
    request_body JSONB,
    response_summary JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


async def ensure_schema():
    """Create tables and indexes if they don't exist. Called on startup."""
    pool = get_pool()
    async with pool.acquire() as conn:
        # Check which tables exist
        existing_tables = await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
        existing_set = {row["tablename"] for row in existing_tables}
        missing = [t for t in REQUIRED_TABLES if t not in existing_set]

        if missing:
            logger.info(f"Missing tables: {missing}. Creating schema...")
            await conn.execute(SCHEMA_SQL)
            logger.info("Schema created successfully")
        else:
            logger.info("All tables exist")

        # Check and create indexes
        existing_indexes = await conn.fetch(
            "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
        )
        existing_idx_set = {row["indexname"] for row in existing_indexes}

        for idx_name, table, columns in REQUIRED_INDEXES:
            if idx_name not in existing_idx_set:
                sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({columns})"
                await conn.execute(sql)
                logger.info(f"Created index: {idx_name}")

        logger.info("Schema and indexes verified")


async def close_pool():
    """Close the connection pool. Call on shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed")


def get_pool() -> asyncpg.Pool:
    """Get the connection pool. Raises if not initialized."""
    assert _pool is not None, "Database pool not initialized. Call init_pool() first."
    return _pool


async def execute_read_query(query: str, params: list | None = None) -> list[dict]:
    """Execute a SELECT query and return all rows as list of dicts."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            logger.debug(f"READ: {query[:100]}... params={params}")
            if params:
                rows = await conn.fetch(query, *params)
            else:
                rows = await conn.fetch(query)
            return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error executing read query: {e}", exc_info=True)
        return []


async def execute_read_one_query(query: str, params: list | None = None) -> dict | None:
    """Execute a SELECT query and return a single row as dict, or None."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            logger.debug(f"READ_ONE: {query[:100]}... params={params}")
            if params:
                row = await conn.fetchrow(query, *params)
            else:
                row = await conn.fetchrow(query)
            return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error executing read one query: {e}", exc_info=True)
        return None


async def execute_insert_query(query: str, params: list | None = None) -> dict | None:
    """Execute an INSERT ... RETURNING query and return the inserted row as dict."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            logger.debug(f"INSERT: {query[:100]}... params={params}")
            if params:
                row = await conn.fetchrow(query, *params)
            else:
                row = await conn.fetchrow(query)
            return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error executing insert query: {e}", exc_info=True)
        return None


async def execute_update_query(query: str, params: list | None = None) -> bool:
    """Execute an UPDATE query. Returns True on success, False on error."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            logger.debug(f"UPDATE: {query[:100]}... params={params}")
            if params:
                await conn.execute(query, *params)
            else:
                await conn.execute(query)
            return True
    except Exception as e:
        logger.error(f"Error executing update query: {e}", exc_info=True)
        return False


async def execute_delete_query(query: str, params: list | None = None) -> bool:
    """Execute a DELETE query. Returns True on success, False on error."""
    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            logger.debug(f"DELETE: {query[:100]}... params={params}")
            if params:
                await conn.execute(query, *params)
            else:
                await conn.execute(query)
            return True
    except Exception as e:
        logger.error(f"Error executing delete query: {e}", exc_info=True)
        return False
