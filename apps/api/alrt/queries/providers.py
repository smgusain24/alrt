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


# Upsert a Slack provider after OAuth completes.
# $1=id (UUID, ignored on conflict), $2=team_id (UUID), $3=encrypted_config (JSONB)
UPSERT_SLACK = """
    INSERT INTO providers (id, team_id, channel, provider_type, config, is_active)
    VALUES ($1, $2, 'slack', 'slack', $3, true)
    ON CONFLICT (team_id, channel, provider_type)
    DO UPDATE SET config = $3, is_active = true, updated_at = now()
    RETURNING id, channel, provider_type, is_active, created_at
"""
