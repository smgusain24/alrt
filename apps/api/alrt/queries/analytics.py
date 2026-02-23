OVERVIEW_METRICS = """
    SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
        COUNT(*) FILTER (WHERE status = 'pending') as total_pending
    FROM notifications
    WHERE team_id = $1 AND created_at >= $2
"""

DELIVERY_BY_CHANNEL = """
    SELECT
        channel,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
    FROM notifications
    WHERE team_id = $1 AND created_at >= $2
    GROUP BY channel
"""

WORKFLOW_METRICS = """
    SELECT
        w.id as workflow_id,
        w.name as workflow_name,
        COUNT(e.id) as total_executions,
        COUNT(e.id) FILTER (WHERE e.status = 'completed') as success_executions,
        COUNT(e.id) FILTER (WHERE e.status = 'failed') as failed_executions,
        AVG(EXTRACT(EPOCH FROM (e.updated_at - e.created_at))) FILTER (WHERE e.status = 'completed') as avg_duration_s
    FROM workflows w
    LEFT JOIN workflow_executions e ON w.id = e.workflow_id
    WHERE w.team_id = $1
    GROUP BY w.id, w.name
    ORDER BY total_executions DESC
"""

NOTIFICATION_TIMELINE = """
    SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM notifications
    WHERE team_id = $1 AND created_at >= $2
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date ASC
"""
