CREATE = """
    INSERT INTO providers (id, team_id, channel, provider_type, config)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, channel, provider_type, is_active, created_at
"""

LIST_BY_TEAM = """
    SELECT id, channel, provider_type, is_active, created_at
    FROM providers WHERE team_id = $1
    ORDER BY created_at DESC
"""

FIND_BY_ID = """
    SELECT id, team_id, channel, provider_type, config, is_active, created_at
    FROM providers WHERE id = $1 AND team_id = $2
"""

FIND_ACTIVE_BY_CHANNEL = """
    SELECT id, team_id, channel, provider_type, config, is_active
    FROM providers WHERE team_id = $1 AND channel = $2 AND is_active = true
    LIMIT 1
"""

DELETE = """
    DELETE FROM providers WHERE id = $1 AND team_id = $2
"""
