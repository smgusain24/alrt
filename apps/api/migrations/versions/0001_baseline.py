"""baseline — current schema (reuses db.py DDL so it matches ensure_schema)

Revision ID: 0001_baseline
Revises:
Create Date: 2026-07-07

All DDL is idempotent (``CREATE ... IF NOT EXISTS``), so ``upgrade head`` is safe on a
DB already created by ``ensure_schema`` — it becomes a no-op that just stamps the
revision. Fresh DBs get the full schema. Reusing the db.py constants keeps a single
source of DDL truth.
"""
from alembic import op

from alrt.db import EXTRA_DDL, REQUIRED_INDEXES, SCHEMA_SQL

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(SCHEMA_SQL)
    for name, table, columns in REQUIRED_INDEXES:
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({columns})")
    for ddl in EXTRA_DDL:
        op.execute(ddl)


def downgrade() -> None:
    # Baseline is the floor — no downgrade.
    pass
