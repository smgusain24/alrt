INSERT = """
    INSERT INTO event_logs (team_id, method, path, status_code, latency_ms, request_body, response_summary, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
"""

LIST = """
    SELECT id, team_id, method, path, status_code, latency_ms,
           request_body, response_summary, ip_address, user_agent, created_at
    FROM event_logs
    WHERE team_id = $1
      AND ($2::varchar IS NULL OR method = $2)
      AND ($3::varchar IS NULL OR path ILIKE '%' || $3 || '%')
      AND ($4::integer IS NULL OR status_code >= $4)
      AND ($5::integer IS NULL OR status_code <= $5)
      AND ($6::timestamptz IS NULL OR created_at >= $6)
      AND ($7::timestamptz IS NULL OR created_at <= $7)
    ORDER BY created_at DESC
    LIMIT $8 OFFSET $9
"""

COUNT = """
    SELECT COUNT(*) as total
    FROM event_logs
    WHERE team_id = $1
      AND ($2::varchar IS NULL OR method = $2)
      AND ($3::varchar IS NULL OR path ILIKE '%' || $3 || '%')
      AND ($4::integer IS NULL OR status_code >= $4)
      AND ($5::integer IS NULL OR status_code <= $5)
      AND ($6::timestamptz IS NULL OR created_at >= $6)
      AND ($7::timestamptz IS NULL OR created_at <= $7)
"""

GET_ONE = """
    SELECT id, team_id, method, path, status_code, latency_ms,
           request_body, response_summary, ip_address, user_agent, created_at
    FROM event_logs
    WHERE id = $1 AND team_id = $2
"""
