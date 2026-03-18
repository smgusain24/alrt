CREATE = """
    INSERT INTO subscribers (
        id, team_id, external_id, email, name, slack_user_id,
        phone_number, discord_webhook_url, telegram_chat_id,
        custom_properties, channel_preferences
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, external_id, email, name, phone_number, slack_user_id,
              discord_webhook_url, telegram_chat_id,
              custom_properties, channel_preferences, push_tokens, created_at, updated_at
"""

FIND_BY_EXTERNAL_ID = """
    SELECT id, team_id, external_id, email, name, slack_user_id,
           phone_number, discord_webhook_url, telegram_chat_id,
           custom_properties, channel_preferences, push_tokens, created_at, updated_at
    FROM subscribers
    WHERE team_id = $1 AND external_id = $2 AND is_deleted = false
"""

UPSERT_BY_EXTERNAL_ID = """
    INSERT INTO subscribers (
        id, team_id, external_id, email, name, phone_number,
        discord_webhook_url, telegram_chat_id, custom_properties
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (team_id, external_id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, subscribers.email),
        name = COALESCE(EXCLUDED.name, subscribers.name),
        phone_number = COALESCE(EXCLUDED.phone_number, subscribers.phone_number),
        discord_webhook_url = COALESCE(EXCLUDED.discord_webhook_url, subscribers.discord_webhook_url),
        telegram_chat_id = COALESCE(EXCLUDED.telegram_chat_id, subscribers.telegram_chat_id),
        custom_properties = subscribers.custom_properties || COALESCE(EXCLUDED.custom_properties, '{}'),
        updated_at = now()
    RETURNING id, external_id, email, name, phone_number, slack_user_id,
              discord_webhook_url, telegram_chat_id,
              custom_properties, channel_preferences, push_tokens, created_at, updated_at
"""

FIND_BY_ID = """
    SELECT id, team_id, external_id, email, name, slack_user_id,
           phone_number, discord_webhook_url, telegram_chat_id,
           custom_properties, channel_preferences, push_tokens, created_at, updated_at
    FROM subscribers WHERE id = $1 AND is_deleted = false
"""

LIST_BY_TEAM = """
    SELECT id, external_id, email, name, slack_user_id,
           phone_number, discord_webhook_url, telegram_chat_id,
           custom_properties, channel_preferences, push_tokens, created_at, updated_at
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
        phone_number = COALESCE($5, phone_number),
        discord_webhook_url = COALESCE($6, discord_webhook_url),
        telegram_chat_id = COALESCE($7, telegram_chat_id),
        custom_properties = COALESCE($8, custom_properties),
        channel_preferences = COALESCE($9, channel_preferences),
        updated_at = now()
    WHERE id = $1
    RETURNING id, external_id, email, name, phone_number, slack_user_id,
              discord_webhook_url, telegram_chat_id,
              custom_properties, channel_preferences, push_tokens, created_at, updated_at
"""

SOFT_DELETE = """
    UPDATE subscribers SET is_deleted = true, updated_at = now()
    WHERE id = $1
"""

UPDATE_PREFERENCES = """
    UPDATE subscribers SET channel_preferences = $2, updated_at = now()
    WHERE id = $1
    RETURNING id, external_id, email, name, phone_number, slack_user_id,
              discord_webhook_url, telegram_chat_id,
              custom_properties, channel_preferences, push_tokens, created_at, updated_at
"""

ADD_PUSH_TOKEN = """
    UPDATE subscribers SET
        push_tokens = (
            SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
            FROM jsonb_array_elements(
                CASE WHEN push_tokens = '[]'::jsonb THEN '[]'::jsonb ELSE push_tokens END
            ) t
            WHERE t->>'token' != $2
        ) || $3::jsonb,
        updated_at = now()
    WHERE id = $1 AND is_deleted = false
    RETURNING push_tokens
"""

REMOVE_PUSH_TOKEN = """
    UPDATE subscribers SET
        push_tokens = (
            SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
            FROM jsonb_array_elements(push_tokens) t
            WHERE t->>'token' != $2
        ),
        updated_at = now()
    WHERE id = $1 AND is_deleted = false
    RETURNING push_tokens
"""

GET_PUSH_TOKENS = """
    SELECT push_tokens FROM subscribers WHERE id = $1 AND is_deleted = false
"""
