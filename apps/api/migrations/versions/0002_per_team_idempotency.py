"""per-team idempotency — drop the legacy global UNIQUE(idempotency_key)

Revision ID: 0002_per_team_idempotency
Revises: 0001_baseline
Create Date: 2026-07-07

Early schemas had a global ``UNIQUE(idempotency_key)`` on workflow_executions, which
made one team's key collide with another's. Streams 1-2 switched fresh schemas to
``UNIQUE(team_id, idempotency_key)``, but an existing DB still carries the old
constraint. This drops the global one (if present) and ensures the per-team one exists.
No-op on fresh DBs (already per-team).
"""
from alembic import op

revision = "0002_per_team_idempotency"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE workflow_executions "
        "DROP CONSTRAINT IF EXISTS workflow_executions_idempotency_key_key"
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'workflow_executions'::regclass
                  AND conname = 'workflow_executions_team_id_idempotency_key_key'
            ) THEN
                ALTER TABLE workflow_executions
                    ADD CONSTRAINT workflow_executions_team_id_idempotency_key_key
                    UNIQUE (team_id, idempotency_key);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    pass
