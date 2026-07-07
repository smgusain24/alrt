"""Make DB rows safe to hand to Celery's JSON serializer.

asyncpg returns UUID and datetime objects that json.dumps can't encode. Convert
them (recursively) so a row can travel through a task's kwargs or a Redis cache.
"""

import uuid
from datetime import date, datetime


def json_safe(value):
    """Recursively convert UUID/datetime to str so a value is JSON-serializable."""
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    return value
