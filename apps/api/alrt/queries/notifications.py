CREATE = """
    INSERT INTO notifications (id, team_id, subscriber_id, workflow_execution_id, channel, title, body, action_url, payload, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, channel, title, body, action_url, payload, status, is_read, is_archived, created_at
"""

FIND_BY_ID = """
    SELECT id, channel, title, body, action_url, payload, status, is_read, is_archived, created_at
    FROM notifications WHERE id = $1 AND subscriber_id = $2
"""

LIST_BY_SUBSCRIBER = """
    SELECT id, channel, title, body, action_url, payload, status, is_read, is_archived, created_at
    FROM notifications
    WHERE subscriber_id = $1 AND team_id = $2 AND is_archived = false
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
"""

LIST_BY_SUBSCRIBER_FILTERED = """
    SELECT id, channel, title, body, action_url, payload, status, is_read, is_archived, created_at
    FROM notifications
    WHERE subscriber_id = $1 AND team_id = $2 AND is_archived = false
        AND ($3::varchar IS NULL OR channel = $3)
        AND ($4::boolean IS NULL OR is_read = $4)
    ORDER BY created_at DESC
    LIMIT $5 OFFSET $6
"""

UPDATE_READ_STATUS = """
    UPDATE notifications SET is_read = $2, updated_at = now()
    WHERE id = $1
    RETURNING id, channel, title, body, action_url, payload, status, is_read, is_archived, created_at
"""

UPDATE_ARCHIVED_STATUS = """
    UPDATE notifications SET is_archived = $2, updated_at = now()
    WHERE id = $1
    RETURNING id, channel, title, body, action_url, payload, status, is_read, is_archived, created_at
"""

MARK_ALL_READ = """
    UPDATE notifications SET is_read = true, updated_at = now()
    WHERE subscriber_id = $1 AND is_read = false
"""

UPDATE_STATUS = """
    UPDATE notifications SET status = $2, updated_at = now()
    WHERE id = $1
"""
