CREATE = """
    INSERT INTO subscribers (id, team_id, external_id, email, name, slack_user_id, custom_properties, channel_preferences)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, external_id, email, name, slack_user_id, custom_properties, channel_preferences, created_at, updated_at
"""

FIND_BY_EXTERNAL_ID = """
    SELECT id, team_id, external_id, email, name, slack_user_id,
           custom_properties, channel_preferences, created_at, updated_at
    FROM subscribers
    WHERE team_id = $1 AND external_id = $2 AND is_deleted = false
"""

FIND_BY_ID = """
    SELECT id, team_id, external_id, email, name, slack_user_id,
           custom_properties, channel_preferences, created_at, updated_at
    FROM subscribers WHERE id = $1 AND is_deleted = false
"""

LIST_BY_TEAM = """
    SELECT id, external_id, email, name, slack_user_id,
           custom_properties, channel_preferences, created_at, updated_at
    FROM subscribers
    WHERE team_id = $1 AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
"""

COUNT_BY_TEAM = """
    SELECT COUNT(*) as total
    FROM subscribers
    WHERE team_id = $1 AND is_deleted = false
"""

UPDATE = """
    UPDATE subscribers SET
        email = COALESCE($2, email),
        name = COALESCE($3, name),
        slack_user_id = COALESCE($4, slack_user_id),
        custom_properties = COALESCE($5, custom_properties),
        channel_preferences = COALESCE($6, channel_preferences),
        updated_at = now()
    WHERE id = $1
    RETURNING id, external_id, email, name, slack_user_id, custom_properties, channel_preferences, created_at, updated_at
"""

SOFT_DELETE = """
    UPDATE subscribers SET is_deleted = true, updated_at = now()
    WHERE id = $1
"""

UPDATE_PREFERENCES = """
    UPDATE subscribers SET channel_preferences = $2, updated_at = now()
    WHERE id = $1
    RETURNING id, external_id, email, name, slack_user_id, custom_properties, channel_preferences, created_at, updated_at
"""
