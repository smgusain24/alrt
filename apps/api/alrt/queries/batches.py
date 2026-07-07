"""SQL for bulk_batches — the pollable record for an async bulk trigger."""

CREATE = """
    INSERT INTO bulk_batches (id, team_id, workflow_id, idempotency_key, total, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, team_id, workflow_id, total, accepted, errors, status, created_at, updated_at
"""

FIND_BY_ID = """
    SELECT id, team_id, workflow_id, total, accepted, errors, status, created_at, updated_at
    FROM bulk_batches
    WHERE id = $1 AND team_id = $2
"""

FIND_BY_IDEMPOTENCY = """
    SELECT id FROM bulk_batches
    WHERE team_id = $1 AND idempotency_key = $2
    ORDER BY created_at DESC
    LIMIT 1
"""
