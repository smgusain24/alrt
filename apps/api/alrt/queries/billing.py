# Plans
LIST_ACTIVE_PLANS = """
    SELECT id, name, display_name, price_inr, quota_limit, features, sort_order
    FROM plans
    WHERE is_active = true
    ORDER BY sort_order
"""

FIND_PLAN_BY_ID = """
    SELECT id, name, display_name, price_inr, quota_limit, features
    FROM plans
    WHERE id = $1 AND is_active = true
"""

FIND_PLAN_BY_NAME = """
    SELECT id, name, display_name, price_inr, quota_limit, features
    FROM plans
    WHERE name = $1 AND is_active = true
"""

# Team billing state (join team + plan + current quota)
GET_TEAM_BILLING = """
    SELECT t.plan_id, t.billing_status, t.billing_provider, t.subscription_id,
           t.trial_ends_at, t.period_ends_at,
           p.name AS plan_name, p.display_name AS plan_display_name,
           p.price_inr, p.quota_limit,
           COALESCE(q.monthly_count, 0) AS quota_used
    FROM teams t
    LEFT JOIN plans p ON t.plan_id = p.id
    LEFT JOIN team_quotas q ON q.team_id = t.id
        AND q.period_start = date_trunc('month', now())
    WHERE t.id = $1
"""

# Update team billing fields after subscription events
UPDATE_TEAM_BILLING = """
    UPDATE teams
    SET plan_id = $2, billing_status = $3, billing_provider = $4,
        subscription_id = $5, period_ends_at = $6, updated_at = now()
    WHERE id = $1
"""

UPDATE_TEAM_STATUS = """
    UPDATE teams SET billing_status = $2, updated_at = now()
    WHERE id = $1
"""

UPDATE_TEAM_PERIOD_END = """
    UPDATE teams SET period_ends_at = $2, updated_at = now()
    WHERE id = $1
"""

# Billing events
INSERT_BILLING_EVENT = """
    INSERT INTO billing_events (team_id, provider, event_type, event_id, payload_hash, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (provider, event_id) DO NOTHING
    RETURNING id
"""

# Quota check (read-only, used by enforce_quota dependency)
GET_QUOTA_FOR_ENFORCEMENT = """
    SELECT t.billing_status, t.trial_ends_at, t.period_ends_at,
           p.name AS plan_name, p.quota_limit,
           COALESCE(q.monthly_count, 0) AS quota_used
    FROM teams t
    LEFT JOIN plans p ON t.plan_id = p.id
    LEFT JOIN team_quotas q ON q.team_id = t.id
        AND q.period_start = date_trunc('month', now())
    WHERE t.id = $1
"""

# Get admin email for billing provider customer creation
FIND_ADMIN_EMAIL_BY_TEAM = """
    SELECT email FROM users WHERE team_id = $1 AND role = 'admin' LIMIT 1
"""

# Beat tasks
EXPIRE_TRIALS = """
    UPDATE teams SET billing_status = 'expired', updated_at = now()
    WHERE billing_status = 'trialing' AND trial_ends_at < now()
"""

EXPIRE_CANCELLED = """
    UPDATE teams SET billing_status = 'expired', updated_at = now()
    WHERE billing_status = 'cancelled' AND period_ends_at < now()
"""

RESET_MONTHLY_QUOTAS = """
    DELETE FROM team_quotas
    WHERE period_start < date_trunc('month', now())
"""
