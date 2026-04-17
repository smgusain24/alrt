# @alrt/node

Official TypeScript SDK for [alrt](https://alrt.dev) notification infrastructure.

## Installation

```bash
npm install @alrt/node
# or
pnpm add @alrt/node
```

## Quick Start

```typescript
import { Alrt } from "@alrt/node";

const alrt = new Alrt({ apiKey: "alrt_sk_..." });

await alrt.events.trigger({
  workflow: "order.completed",
  subscriberId: "user-123",
  payload: { orderId: "42", amount: 99.99 },
});
```

## Configuration

```typescript
const alrt = new Alrt({
  apiKey: "alrt_sk_...",         // Required
  baseUrl: "http://localhost:8000", // Optional (default)
  maxRetries: 3,                    // Optional (default: 3)
  timeout: 30000,                   // Optional (default: 30s)
});
```

## Events

### Trigger

```typescript
const result = await alrt.events.trigger({
  workflow: "order.completed",
  subscriberId: "user-123",
  // or: subscriber: { id: "user-123", email: "alice@example.com" }
  payload: { orderId: "42" },
  channels: ["email", "in_app"],       // optional: filter channels
  idempotencyKey: "order-42-notif",    // optional: prevent duplicates
});
// result: { eventId, status, warnings, channelsRequested?, channelsMatched?, scheduledAt? }
```

### Trigger Bulk

```typescript
const result = await alrt.events.triggerBulk({
  workflow: "promo.launched",
  subscribers: [{ id: "user-1" }, { id: "user-2", email: "bob@example.com" }],
  payload: { promoCode: "SAVE20" },
});
// result: { batchId, total, accepted, duplicates, errors, results[] }
```

## Subscribers

### Create

```typescript
const sub = await alrt.subscribers.create({
  externalId: "user-123",
  email: "alice@example.com",
  name: "Alice",
  phoneNumber: "+15551234567",
});
```

### List

```typescript
const subscribers = await alrt.subscribers.list({ limit: 20, offset: 0 });
```

### Get / Update / Delete

```typescript
const sub = await alrt.subscribers.get("user-123");
const updated = await alrt.subscribers.update("user-123", { name: "Bob" });
await alrt.subscribers.delete("user-123");
```

### Preferences

```typescript
const prefs = await alrt.subscribers.getPreferences("user-123");
await alrt.subscribers.updatePreferences("user-123", {
  channelPreferences: { global: { email: true, sms: false } },
});
```

### Push Tokens

```typescript
await alrt.subscribers.registerPushToken("user-123", {
  token: "fcm_token_xxx",
  platform: "android",
  deviceId: "pixel-7-abc",
});

const tokens = await alrt.subscribers.listPushTokens("user-123");
await alrt.subscribers.removePushToken("user-123", "fcm_token_xxx");
```

## Error Handling

```typescript
import { Alrt, AlrtAuthError, AlrtRateLimitError, AlrtValidationError } from "@alrt/node";

try {
  await alrt.events.trigger({ workflow: "test", subscriberId: "u1" });
} catch (error) {
  if (error instanceof AlrtAuthError) {
    console.error("Invalid API key:", error.message);
  } else if (error instanceof AlrtRateLimitError) {
    console.error("Rate limited. Retry after:", error.retryAfter, "seconds");
  } else if (error instanceof AlrtValidationError) {
    console.error("Bad request:", error.message);
  }
}
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

Built-in retry on 429 and 5xx responses with exponential backoff:
- Respects `Retry-After` header when present
- Base delay: 500ms with exponential increase + jitter
- Configurable via `maxRetries` (default: 3)
- 4xx errors (except 429) are never retried

## License

MIT
