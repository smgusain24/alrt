CREATE = """
    INSERT INTO users (id, email, password_hash, name, team_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, name, avatar_url, role, team_id,
              is_active, email_verified, last_login_at, created_at, updated_at
"""

FIND_BY_EMAIL = """
    SELECT id, email, password_hash, name, avatar_url, role, team_id,
           is_active, email_verified, last_login_at, created_at, updated_at
    FROM users WHERE email = $1
"""

FIND_BY_ID = """
    SELECT id, email, name, avatar_url, role, team_id,
           is_active, email_verified, created_at, updated_at
    FROM users WHERE id = $1 AND is_active = true
"""

UPDATE_LAST_LOGIN = """
    UPDATE users SET last_login_at = now(), updated_at = now()
    WHERE id = $1
"""
