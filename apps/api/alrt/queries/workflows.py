CREATE = """
    INSERT INTO workflows (id, team_id, name, event_name, definition)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, event_name, definition, status, created_at, updated_at
"""

FIND_BY_ID = """
    SELECT id, team_id, name, event_name, definition, status, created_at, updated_at
    FROM workflows WHERE id = $1 AND team_id = $2
"""

FIND_BY_EVENT_NAME = """
    SELECT id, team_id, name, event_name, definition, status, created_at, updated_at
    FROM workflows WHERE team_id = $1 AND event_name = $2
"""

FIND_PUBLISHED_BY_EVENT = """
    SELECT id, team_id, name, event_name, definition, status, created_at, updated_at
    FROM workflows WHERE team_id = $1 AND event_name = $2 AND status = 'published'
"""

LIST_BY_TEAM = """
    SELECT id, name, event_name, definition, status, created_at, updated_at
    FROM workflows WHERE team_id = $1
    ORDER BY created_at DESC
"""

UPDATE = """
    UPDATE workflows SET
        name = COALESCE($3, name),
        event_name = COALESCE($4, event_name),
        definition = COALESCE($5, definition),
        updated_at = now()
    WHERE id = $1 AND team_id = $2
    RETURNING id, name, event_name, definition, status, created_at, updated_at
"""

PUBLISH = """
    UPDATE workflows SET status = 'published', updated_at = now()
    WHERE id = $1 AND team_id = $2
    RETURNING id, name, event_name, definition, status, created_at, updated_at
"""

DELETE = """
    DELETE FROM workflows WHERE id = $1 AND team_id = $2
"""
