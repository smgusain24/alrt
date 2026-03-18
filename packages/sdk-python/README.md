# alrt-python

Official Python SDK for [alrt](https://alrt.dev) notification infrastructure.

## Installation

```bash
pip install alrt-python
```

## Quick Start

### Sync

```python
from alrt import Alrt

alrt = Alrt(api_key="alrt_sk_...")

result = alrt.events.trigger(
    workflow="order.completed",
    subscriber_id="user-123",
    payload={"order_id": "42", "amount": 99.99},
)
print(result.event_id, result.status)
```

### Async

```python
from alrt import AsyncAlrt

async with AsyncAlrt(api_key="alrt_sk_...") as alrt:
    result = await alrt.events.trigger(
        workflow="order.completed",
        subscriber_id="user-123",
        payload={"order_id": "42"},
    )
```

## Configuration

```python
alrt = Alrt(
    api_key="alrt_sk_...",              # Required
    base_url="https://api.alrt.dev",    # Optional (default)
    max_retries=3,                       # Optional (default: 3)
    timeout=30.0,                        # Optional (default: 30s)
)
```

## Events

### Trigger

```python
result = alrt.events.trigger(
    workflow="order.completed",
    subscriber_id="user-123",
    payload={"order_id": "42"},
    channels=["email", "in_app"],           # optional
    idempotency_key="order-42-notif",       # optional
)
# result: TriggerEventResponse(event_id, status, warnings, ...)
```

### Trigger Bulk

```python
result = alrt.events.trigger_bulk(
    workflow="promo.launched",
    subscribers=[{"id": "user-1"}, {"id": "user-2"}],
    payload={"promo_code": "SAVE20"},
)
# result: TriggerBulkResponse(batch_id, total, accepted, ...)
```

## Subscribers

### Create / Get / Update / Delete

```python
sub = alrt.subscribers.create(external_id="user-123", email="alice@example.com")
sub = alrt.subscribers.get("user-123")
sub = alrt.subscribers.update("user-123", name="Bob")
alrt.subscribers.delete("user-123")
```

### List

```python
subscribers = alrt.subscribers.list(limit=20, offset=0)
```

### Preferences

```python
prefs = alrt.subscribers.get_preferences("user-123")
alrt.subscribers.update_preferences("user-123", {"global": {"email": True}})
```

### Push Tokens

```python
alrt.subscribers.register_push_token("user-123", token="fcm_xxx", platform="android")
tokens = alrt.subscribers.list_push_tokens("user-123")
alrt.subscribers.remove_push_token("user-123", "fcm_xxx")
```

## Error Handling

```python
from alrt import Alrt, AlrtAuthError, AlrtRateLimitError, AlrtValidationError

try:
    alrt.events.trigger(workflow="test", subscriber_id="u1")
except AlrtAuthError as e:
    print(f"Invalid API key: {e.message}")
except AlrtRateLimitError as e:
    print(f"Rate limited. Retry after: {e.retry_after}s")
except AlrtValidationError as e:
    print(f"Bad request: {e.message}")
```

### Error Types

| Error | Status | When |
|-------|--------|------|
| `AlrtAuthError` | 401 | Invalid or missing API key |
| `AlrtValidationError` | 400, 422 | Bad request payload |
| `AlrtNotFoundError` | 404 | Resource not found |
| `AlrtConflictError` | 409 | Resource already exists |
| `AlrtRateLimitError` | 429 | Rate limit exceeded |
| `AlrtApiError` | 5xx | Server error |

All errors extend `AlrtError` and expose `status`, `code`, and `message`.

## Retry

Built-in retry on 429 and 5xx with exponential backoff:
- Respects `Retry-After` header
- Base delay: 500ms with exponential increase + jitter
- Configurable via `max_retries` (default: 3)

## License

MIT
