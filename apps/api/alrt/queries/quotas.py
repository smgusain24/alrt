# Atomic upsert: increment monthly_count and set over_limit flag in one statement.
# $1 = team_id (UUID), $2 = quota_limit (int, e.g. 1000)
# The (team_quotas.monthly_count + 1) > $2 comparison sets over_limit AFTER increment.
UPSERT_QUOTA = """
    INSERT INTO team_quotas (team_id, period_start, monthly_count, over_limit)
    VALUES ($1, date_trunc('month', now()), 1, (1 > $2))
    ON CONFLICT (team_id, period_start) DO UPDATE
    SET monthly_count = team_quotas.monthly_count + 1,
        over_limit    = (team_quotas.monthly_count + 1) > $2,
        updated_at    = now()
"""

# Returns current month's quota status. Returns None if no deliveries yet this month.
# $1 = team_id (UUID)
GET_QUOTA_STATUS = """
    SELECT monthly_count, over_limit, period_start
    FROM team_quotas
    WHERE team_id = $1
      AND period_start = date_trunc('month', now())
"""
