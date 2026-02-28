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

# ─── alrt_hosted provider queries ───

# Insert an alrt_hosted email provider at team signup. Config stores display_name only — no secrets.
# $1=id (UUID), $2=team_id (UUID), $3=display_name (str, team name fallback)
CREATE_ALRT_HOSTED_EMAIL = """
    INSERT INTO providers (id, team_id, channel, provider_type, config, is_active)
    VALUES ($1, $2, 'email', 'alrt_hosted', jsonb_build_object('display_name', $3::text), true)
    RETURNING id, channel, provider_type, is_active, created_at
"""

# Insert an alrt_hosted Slack provider placeholder at team signup. Inactive until OAuth completes.
# $1=id (UUID), $2=team_id (UUID)
CREATE_ALRT_HOSTED_SLACK = """
    INSERT INTO providers (id, team_id, channel, provider_type, config, is_active)
    VALUES ($1, $2, 'slack', 'alrt_hosted', '{"status": "pending"}'::jsonb, false)
    RETURNING id, channel, provider_type, is_active, created_at
"""

# Upsert the slack alrt_hosted provider after OAuth completes.
# Sets is_active=true and stores workspace_name + workspace_id in config.
# Config is encrypted (bot_token is a secret). Use _encrypt_config() before passing $3.
# $1=id (UUID, ignored on conflict), $2=team_id (UUID), $3=encrypted_config (JSONB)
UPSERT_SLACK_ALRT_HOSTED = """
    INSERT INTO providers (id, team_id, channel, provider_type, config, is_active)
    VALUES ($1, $2, 'slack', 'alrt_hosted', $3, true)
    ON CONFLICT (team_id, channel, provider_type)
    DO UPDATE SET config = $3, is_active = true, updated_at = now()
    RETURNING id, channel, provider_type, is_active, created_at
"""

# Deactivate a team's alrt_hosted Slack provider when tokens_revoked event received.
# Matches by Slack workspace_id stored in config JSONB.
# $1 = workspace_id (str, the Slack team_id from OAuth response, e.g. "T01ABC123")
DEACTIVATE_SLACK_BY_WORKSPACE = """
    UPDATE providers
    SET is_active = false, updated_at = now()
    WHERE channel = 'slack'
      AND provider_type = 'alrt_hosted'
      AND (config->>'workspace_id') = $1
"""

# Get the channels status for a team: one row per channel (email + slack).
# Returns is_active status and workspace_name from config for display.
# $1 = team_id (UUID)
GET_CHANNELS_STATUS = """
    SELECT channel, provider_type, is_active,
           config->>'workspace_name' AS workspace_name,
           config->>'display_name'  AS display_name,
           created_at, updated_at
    FROM providers
    WHERE team_id = $1
      AND provider_type = 'alrt_hosted'
    ORDER BY channel
"""
