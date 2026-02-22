CREATE = """
    INSERT INTO teams (id, name) VALUES ($1, $2)
    RETURNING id, name, created_at, updated_at
"""

FIND_BY_ID = """
    SELECT id, name, created_at, updated_at
    FROM teams WHERE id = $1
"""
