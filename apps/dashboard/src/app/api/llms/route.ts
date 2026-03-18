import { NextResponse } from "next/server";

const LLMS_TXT = `# alrt SDK Reference
> alrt is notification infrastructure for dev teams. One API key, 6+ channels.
> Official SDKs: @alrt/node (TypeScript) and alrt-python (Python).

## Installation

\`\`\`bash
npm install @alrt/node
pip install alrt-python
\`\`\`

## Client Initialization

### Node.js (TypeScript)
\`\`\`typescript
import { Alrt } from "@alrt/node";
const client = new Alrt({ apiKey: "alrt_sk_..." });
\`\`\`

### Python (sync)
\`\`\`python
from alrt import Alrt
client = Alrt(api_key="alrt_sk_...")
\`\`\`

### Python (async)
\`\`\`python
from alrt import AsyncAlrt
async with AsyncAlrt(api_key="alrt_sk_...") as client:
    ...
\`\`\`

## Constructor Options

| Parameter | Type (TS / Python) | Required | Default | Description |
|-----------|-------------------|----------|---------|-------------|
| apiKey / api_key | string / str | Yes | — | Server API key (alrt_sk_...) |
| baseUrl / base_url | string / str | No | https://api.alrt.dev | API base URL |
| maxRetries / max_retries | number / int | No | 3 | Max retry attempts |
| timeout | number / float | No | 30000ms / 30.0s | Request timeout |

## SDK Methods

### Events

#### client.events.trigger(params) / client.events.trigger(**kwargs)
Trigger a notification workflow for a single subscriber.

Parameters:
- workflow (string/str, required): Workflow name
- subscriberId / subscriber_id (string/str): Existing subscriber ID
- subscriber (SubscriberInline/dict): Inline subscriber (auto-create)
- payload (Record<string, unknown>/dict): Template data
- channels (Channel[]/list[str]): Restrict to specific channels
- overrides (ChannelOverrides/dict): Per-channel overrides
- deliverAt / deliver_at (string/str): ISO 8601 scheduled time
- metadata (Record<string, unknown>/dict): Arbitrary metadata
- idempotencyKey / idempotency_key (string/str): Dedup key

Returns: TriggerEventResponse { eventId, status, channelsRequested, channelsMatched, warnings, scheduledAt }

#### client.events.triggerBulk(params) / client.events.trigger_bulk(**kwargs)
Trigger for up to 1,000 subscribers in one request.

Parameters:
- workflow (string/str, required): Workflow name
- subscribers (SubscriberInline[]/list[dict], required): Up to 1,000 subscribers
- payload, channels, idempotencyKey: Same as trigger()

Returns: TriggerBulkResponse { batchId, status, total, accepted, duplicates, errors, results[] }

### Subscribers

#### client.subscribers.create(params) / client.subscribers.create(**kwargs)
Parameters: externalId (required), email, name, phoneNumber, slackUserId, discordWebhookUrl, telegramChatId, customProperties, channelPreferences
Returns: SubscriberResponse

#### client.subscribers.get(subscriberId) / client.subscribers.get(subscriber_id)
Returns: SubscriberResponse

#### client.subscribers.list(params?) / client.subscribers.list(limit?, offset?)
Parameters: limit (default 20), offset (default 0)
Returns: SubscriberResponse[]

#### client.subscribers.update(subscriberId, params) / client.subscribers.update(subscriber_id, **kwargs)
Parameters: email, name, phoneNumber, customProperties, etc.
Returns: SubscriberResponse

#### client.subscribers.delete(subscriberId) / client.subscribers.delete(subscriber_id)
Returns: void/None

### Preferences

#### client.subscribers.getPreferences(subscriberId) / client.subscribers.get_preferences(subscriber_id)
Returns: PreferencesResponse { global, categories, dnd, frequency }

#### client.subscribers.updatePreferences(subscriberId, prefs) / client.subscribers.update_preferences(subscriber_id, preferences)
Parameters: global (channel toggles), categories (per-category), dnd (timezone/start/end), frequency (maxPerDay/maxPerHour)
Returns: PreferencesResponse

### Push Tokens

#### client.subscribers.registerPushToken(subscriberId, params) / client.subscribers.register_push_token(subscriber_id, **kwargs)
Parameters: token (required), platform ("android"|"ios"|"web", required), deviceId
Returns: PushTokenResponse[]

#### client.subscribers.listPushTokens(subscriberId) / client.subscribers.list_push_tokens(subscriber_id)
Returns: PushTokenResponse[]

#### client.subscribers.removePushToken(subscriberId, token) / client.subscribers.remove_push_token(subscriber_id, token)
Returns: PushTokenResponse[]

## Error Classes

All errors extend AlrtError with properties: status (number/int), code (string/str), message (string/str).

| Error Class | Status | Description |
|------------|--------|-------------|
| AlrtAuthError | 401 | Invalid or missing API key |
| AlrtValidationError | 400/422 | Invalid request data |
| AlrtNotFoundError | 404 | Resource not found |
| AlrtConflictError | 409 | Resource already exists |
| AlrtRateLimitError | 429 | Rate limit exceeded (has retryAfter/retry_after) |
| AlrtApiError | 5xx | Server error |

## Retry Behavior

- Retries on 429 and 5xx status codes
- Exponential backoff: 500ms base, 2x multiplier, random jitter
- Respects Retry-After header
- Max 3 retries by default (configurable)
- 400, 401, 404, 409 are NOT retried

## Channel Types

in_app, email, slack, whatsapp, discord, telegram, sms, push_android, push_ios, push_web

## WebSocket (In-App)

1. POST /subscribers/:id/token (server-side, with API key) -> { token: "jwt..." }
2. Connect: wss://api.alrt.dev/ws?token=JWT
3. Receive JSON notification payloads in real-time
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
