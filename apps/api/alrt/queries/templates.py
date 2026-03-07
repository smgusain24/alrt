CREATE = """
    INSERT INTO templates (id, team_id, name, channel, subject, body, variables, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, team_id, name, channel, subject, body, variables, status, created_at, updated_at
"""

FIND_BY_ID = """
    SELECT id, team_id, name, channel, subject, body, variables, status, created_at, updated_at
    FROM templates
    WHERE id = $1 AND team_id = $2
"""

LIST_BY_TEAM = """
    SELECT id, team_id, name, channel, subject, body, variables, status, created_at, updated_at
    FROM templates
    WHERE team_id = $1
        AND ($2::varchar IS NULL OR channel = $2)
        AND ($3::varchar IS NULL OR status = $3)
    ORDER BY updated_at DESC
    LIMIT $4 OFFSET $5
"""

COUNT_BY_TEAM = """
    SELECT COUNT(*) as total
    FROM templates
    WHERE team_id = $1
        AND ($2::varchar IS NULL OR channel = $2)
        AND ($3::varchar IS NULL OR status = $3)
"""

UPDATE = """
    UPDATE templates SET
        name = COALESCE($3, name),
        channel = COALESCE($4, channel),
        subject = $5,
        body = COALESCE($6, body),
        variables = COALESCE($7, variables),
        status = COALESCE($8, status),
        updated_at = now()
    WHERE id = $1 AND team_id = $2
    RETURNING id, team_id, name, channel, subject, body, variables, status, created_at, updated_at
"""

DELETE = """
    DELETE FROM templates WHERE id = $1 AND team_id = $2
"""
