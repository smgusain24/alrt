CREATE_INVITE = """
    INSERT INTO team_invites (id, team_id, email, role, token_hash, invited_by, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (team_id, email) DO UPDATE
        SET token_hash = EXCLUDED.token_hash,
            role = EXCLUDED.role,
            invited_by = EXCLUDED.invited_by,
            expires_at = EXCLUDED.expires_at,
            accepted_at = NULL
    RETURNING id, team_id, email, role, invited_by, accepted_at, expires_at, created_at
"""

FIND_INVITE_BY_HASH = """
    SELECT id, team_id, email, role, token_hash, invited_by, accepted_at, expires_at, created_at
    FROM team_invites
    WHERE token_hash = $1
"""

ACCEPT_INVITE = """
    UPDATE team_invites
    SET accepted_at = now()
    WHERE id = $1 AND accepted_at IS NULL
    RETURNING id
"""

LIST_MEMBERS = """
    SELECT u.id, u.email, u.name, u.role, u.created_at, u.last_login_at,
           'member' as record_type
    FROM users u
    WHERE u.team_id = $1 AND u.is_active = true
    UNION ALL
    SELECT ti.id, ti.email, NULL as name, ti.role, ti.created_at, NULL as last_login_at,
           'invite' as record_type
    FROM team_invites ti
    WHERE ti.team_id = $1 AND ti.accepted_at IS NULL AND ti.expires_at > now()
    ORDER BY created_at DESC
"""

DELETE_INVITE = """
    DELETE FROM team_invites
    WHERE id = $1 AND team_id = $2 AND accepted_at IS NULL
    RETURNING id
"""
