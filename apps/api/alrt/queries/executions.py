CREATE = """
    INSERT INTO workflow_executions
        (id, team_id, workflow_id, subscriber_id, event_payload, channels, overrides, idempotency_key, deliver_at, metadata, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, team_id, workflow_id, subscriber_id, event_payload, channels, overrides,
              status, idempotency_key, deliver_at, metadata, created_at
"""

FIND_BY_ID = """
    SELECT id, team_id, workflow_id, subscriber_id, event_payload, channels, overrides,
           status, idempotency_key, deliver_at, metadata, created_at
    FROM workflow_executions WHERE id = $1
"""

UPDATE_STATUS = """
    UPDATE workflow_executions SET status = $2, updated_at = now()
    WHERE id = $1
"""

GET_DUE_SCHEDULED = """
    SELECT id FROM workflow_executions
    WHERE status = 'scheduled' AND deliver_at <= $1
    ORDER BY deliver_at ASC
    LIMIT 100
"""

UPDATE_STATUS_TO_RUNNING = """
    UPDATE workflow_executions SET status = 'running', updated_at = now()
    WHERE id = $1 AND status = 'scheduled'
"""
