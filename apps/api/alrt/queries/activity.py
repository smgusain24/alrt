LIST_ACTIVITY = """
    SELECT
        we.id as execution_id,
        MIN(n.created_at) as created_at,
        w.event_name,
        w.name as workflow_name,
        we.status as execution_status,
        we.event_payload,
        s.name as subscriber_name,
        s.external_id as subscriber_external_id,
        json_agg(
            json_build_object('channel', n.channel, 'status', n.status, 'error_reason', n.error_reason)
            ORDER BY n.created_at
        ) as channels,
        MAX(CASE WHEN n.status = 'failed' THEN 1 ELSE 0 END)::boolean as has_failure
    FROM workflow_executions we
    JOIN notifications n ON n.workflow_execution_id = we.id
    JOIN subscribers s ON s.id = we.subscriber_id
    LEFT JOIN workflows w ON w.id = we.workflow_id
    WHERE we.team_id = $1
      AND ($2::varchar IS NULL OR s.external_id ILIKE '%' || $2 || '%' OR s.name ILIKE '%' || $2 || '%')
      AND ($3::varchar IS NULL OR w.event_name ILIKE '%' || $3 || '%')
      AND ($4::varchar IS NULL OR n.status = $4)
      AND ($5::varchar IS NULL OR n.channel = $5)
      AND ($6::timestamptz IS NULL OR n.created_at >= $6)
      AND ($7::timestamptz IS NULL OR n.created_at <= $7)
    GROUP BY we.id, w.event_name, w.name, we.status, we.event_payload, s.name, s.external_id
    ORDER BY MIN(n.created_at) DESC
    LIMIT $8 OFFSET $9
"""

COUNT_ACTIVITY = """
    SELECT COUNT(DISTINCT we.id) as total
    FROM workflow_executions we
    JOIN notifications n ON n.workflow_execution_id = we.id
    JOIN subscribers s ON s.id = we.subscriber_id
    LEFT JOIN workflows w ON w.id = we.workflow_id
    WHERE we.team_id = $1
      AND ($2::varchar IS NULL OR s.external_id ILIKE '%' || $2 || '%' OR s.name ILIKE '%' || $2 || '%')
      AND ($3::varchar IS NULL OR w.event_name ILIKE '%' || $3 || '%')
      AND ($4::varchar IS NULL OR n.status = $4)
      AND ($5::varchar IS NULL OR n.channel = $5)
      AND ($6::timestamptz IS NULL OR n.created_at >= $6)
      AND ($7::timestamptz IS NULL OR n.created_at <= $7)
"""
