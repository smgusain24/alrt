CREATE = """
    INSERT INTO teams (id, name, plan_id, billing_status, trial_ends_at)
    VALUES ($1, $2, (SELECT id FROM plans WHERE name = 'free'), 'trialing', now() + INTERVAL '30 days')
    RETURNING id, name, plan_id, billing_status, trial_ends_at, created_at, updated_at
"""

FIND_BY_ID = """
    SELECT id, name, created_at, updated_at
    FROM teams WHERE id = $1
"""
