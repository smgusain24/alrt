CREATE = """
    INSERT INTO workflow_executions (id, team_id, workflow_id, subscriber_id, event_payload, channels, idempotency_key)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, team_id, workflow_id, subscriber_id, event_payload, channels, status, idempotency_key, created_at
"""

FIND_BY_ID = """
    SELECT id, team_id, workflow_id, subscriber_id, event_payload, channels, status, created_at
    FROM workflow_executions WHERE id = $1
"""

UPDATE_STATUS = """
    UPDATE workflow_executions SET status = $2, updated_at = now()
    WHERE id = $1
"""
