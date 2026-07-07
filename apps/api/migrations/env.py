"""Alembic environment — runs migrations against the app's Postgres.

Migrations are raw SQL via ``op.execute`` (no SQLAlchemy models), so ``target_metadata``
is None. The DB URL comes from the app Settings and is normalized to the sync psycopg3
dialect (``postgresql+psycopg://``).
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the app package importable (alembic runs from apps/api).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from alrt.config import settings  # noqa: E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def _sync_url() -> str:
    """Return the DATABASE_URL as a sync psycopg3 SQLAlchemy URL."""
    url = settings.database_url
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


config.set_main_option("sqlalchemy.url", _sync_url())


def run_migrations_offline() -> None:
    context.configure(
        url=_sync_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
