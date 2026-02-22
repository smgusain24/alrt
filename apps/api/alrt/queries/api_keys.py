CREATE = """
    INSERT INTO api_keys (id, team_id, key_hash, key_prefix, key_type, name)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, team_id, key_prefix, key_type, is_active, name, last_used_at, created_at
"""

FIND_BY_HASH = """
    SELECT id, team_id, key_hash, key_prefix, key_type, is_active, name, last_used_at
    FROM api_keys WHERE key_hash = $1 AND is_active = true
"""

LIST_BY_TEAM = """
    SELECT id, key_prefix, key_type, is_active, name, last_used_at, created_at
    FROM api_keys WHERE team_id = $1
    ORDER BY created_at DESC
"""

REVOKE = """
    UPDATE api_keys SET is_active = false, updated_at = now()
    WHERE id = $1 AND team_id = $2
    RETURNING id, key_prefix, key_type, is_active, name, last_used_at, created_at
"""

UPDATE_LAST_USED = """
    UPDATE api_keys SET last_used_at = now()
    WHERE id = $1
"""
