CREATE = """
    INSERT INTO scheduled_steps (id, workflow_execution_id, next_step_id, payload, scheduled_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, workflow_execution_id, next_step_id, status, scheduled_at, created_at
"""

FIND_DUE = """
    SELECT id, workflow_execution_id, next_step_id, payload, scheduled_at
    FROM scheduled_steps
    WHERE status = 'pending' AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
"""

UPDATE_STATUS = """
    UPDATE scheduled_steps SET status = $2, updated_at = now()
    WHERE id = $1
"""
