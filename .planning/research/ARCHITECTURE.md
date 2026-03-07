# Architecture Research

**Domain:** Multi-channel notification infrastructure — v1.1 channel expansion + smart routing
**Researched:** 2026-03-06
**Confidence:** HIGH (existing codebase is ground truth; new channel patterns derived from existing channel implementations)

---

## Existing System Overview

The current architecture is a three-tier distributed system. Understanding it precisely is prerequisite to locating every integration point for the new features.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          API Layer (FastAPI)                          │
│  POST /events/trigger → subscriber upsert → execution create         │
│  → Redis LPUSH to "celery" queue                                     │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Redis Celery v2 message
┌─────────────────────────────▼───────────────────────────────────────┐
│                      Worker Layer (Celery)                            │
│                                                                       │
│  workflow.execute (default queue)                                    │
│      └─ step_runner.execute_step (synchronous, not a Celery task)   │
│              ├─ in_app   → channels/inapp.deliver    [queue: inapp]  │
│              ├─ email    → channels/email.deliver    [queue: email]  │
│              ├─ slack    → channels/slack.deliver    [queue: slack]  │
│              ├─ whatsapp → channels/whatsapp.deliver [queue: whatsapp]│
│              ├─ discord  → channels/discord.deliver  [queue: discord] │
│              └─ telegram → channels/telegram.deliver [queue: telegram]│
│                                                                       │
│  delay.poll_scheduled_steps (Beat, every 30s)                        │
│  retention.archive_old_notifications (Beat, every 24h)               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ asyncpg sync wrapper
┌─────────────────────────────▼───────────────────────────────────────┐
│                       Data Layer                                      │
│  PostgreSQL: subscribers, workflows, workflow_executions,             │
│              notifications, providers, scheduled_steps,              │
│              templates, team_quotas, teams, users, api_keys          │
│  Redis: Celery broker + result backend + Pub/Sub (in-app WS)         │
│         + idempotency cache + frequency cap counters                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Constants

These do not change. All new features must fit within them.

| Constant | Value | Impact on new features |
|----------|-------|----------------------|
| Channel dispatch | `elif` chain in `step_runner._handle_channel()` | Each new channel adds one branch |
| Queue routing | `task_routes` in `celery_app.py` | Each new channel task needs a route entry |
| Imports list | `imports=[]` in `celery_app.py` | Each new channel module must be added |
| DLQ retry map | `task_map` + `queue_map` dicts in `notifications.py` | Each new channel needs entries here |
| Channel field on subscribers table | Flat columns (phone_number, discord_webhook_url, etc.) | Push tokens and webhook URLs need columns |
| Notification channel column | `VARCHAR(20)` — channel name is stored per-record | New channel names must fit this |
| RetryPolicy | `utils/retry.py` dataclass | Each new channel gets its own policy instance |
| Providers table | One active provider per (team_id, channel, provider_type) | Webhook and push channels need provider rows |

---

## New Features: Integration Analysis

### Feature 1: Generic Outbound Webhooks

**What it is:** A workflow node type where alrt POSTs a configurable payload to a client-specified URL. Distinct from inbound webhooks (status callbacks). Equivalent to a "webhook channel" — every future channel could be a webhook template.

**Integration points:**

| Touch point | Change type | Details |
|-------------|-------------|---------|
| `step_runner._handle_channel()` | MODIFY | Add `elif channel == "webhook"` branch |
| `celery_app.task_routes` | MODIFY | Add `"alrt_workers.tasks.channels.webhook.deliver": {"queue": "webhook"}` |
| `celery_app.imports` | MODIFY | Add `"alrt_workers.tasks.channels.webhook"` |
| `notifications.py` task_map/queue_map | MODIFY | Add `"webhook"` entries for DLQ retry |
| `channels/webhook.py` | NEW FILE | Deliver task — full pattern match of existing channels |
| `utils/retry.py` | MODIFY | Add `WEBHOOK_RETRY` policy |
| `subscribers` table | NO CHANGE | Webhook URL stored per-node config (not per-subscriber) |
| `providers` table | OPTIONAL | If team-level default webhook URL is needed |
| Dashboard workflow builder | NEW | Webhook channel node config: URL, method, headers, body template |

**Webhook-specific schema additions (schema.sql):**

```sql
-- No new tables. Webhook config lives in workflow node data (JSONB).
-- Node data structure:
-- { "channel": "webhook", "url": "https://...", "method": "POST",
--   "headers": {"X-Secret": "..."}, "body_template": "{...}" }
```

**Webhook delivery data flow:**

```
step_runner._handle_channel("webhook")
    → webhook.deliver.delay(execution_id, subscriber_id, team_id, template_data, payload)
        → render body_template with {{variable}} interpolation (reuse utils/template.render)
        → httpx.post(url, headers=headers, json=rendered_body, timeout=30)
        → HMAC-SHA256 signature on body → X-Alrt-Signature header
        → on 2xx: mark notification sent
        → on 4xx permanent: dead_letter
        → on 5xx/timeout: retry with exponential backoff
```

**HMAC signing pattern (new, no existing analog):**

```python
import hashlib, hmac

def _sign_payload(body_bytes: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
```

Signing secret stored encrypted in node config or team provider config. This is the only channel that requires per-delivery signing rather than a shared bot token.

**Permanent vs retriable errors:**

| HTTP Range | Treatment |
|------------|-----------|
| 2xx | Sent |
| 408, 429, 5xx, timeout | Retriable |
| 400, 401, 403, 404, 410 | Permanent → dead_letter |

**Retry policy:** 5 retries, 30s initial, exponential backoff, max 3600s, jitter=True. (Match EMAIL_RETRY — webhooks are external like email.)

---

### Feature 2: SMS via Twilio

**What it is:** A delivery channel that sends SMS using Twilio's Messages API. Uses `phone_number` from the subscriber model (already exists in schema). Alrt-hosted account by default; BYOC Twilio SID on higher tiers.

**Integration points:**

| Touch point | Change type | Details |
|-------------|-------------|---------|
| `step_runner._handle_channel()` | MODIFY | Add `elif channel == "sms"` branch |
| `celery_app.task_routes` | MODIFY | Add SMS queue |
| `celery_app.imports` | MODIFY | Add `channels.sms` module |
| `notifications.py` task_map/queue_map | MODIFY | Add `"sms"` entries |
| `channels/sms.py` | NEW FILE | Deliver task |
| `utils/retry.py` | MODIFY | Add `SMS_RETRY` policy |
| `subscribers` table | NO CHANGE | `phone_number` column already exists |
| `providers` table | MODIFY (data) | `channel='sms'` rows with Twilio credentials |
| Env config | NEW | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` for alrt-hosted |

**Twilio credentials model:**

| Provider type | Where credentials come from |
|---------------|---------------------------|
| `alrt_hosted` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` env vars |
| `byoc_twilio` | Encrypted in `providers.config` JSONB — same Fernet pattern as email/slack |

**SMS delivery data flow:**

```
step_runner._handle_channel("sms")
    → subscriber must have phone_number; else log warning + return
    → sms.deliver.delay(execution_id, subscriber_id, team_id, template_data, payload)
        → load subscriber (phone_number)
        → load SMS provider (team_id, channel='sms')
        → if alrt_hosted: account_sid/auth_token from env
        → if byoc_twilio: decrypt from provider.config
        → render template body
        → httpx.post("https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                      auth=(account_sid, auth_token),
                      data={"To": phone_number, "From": from_number, "Body": body})
        → on 201: mark sent, store Twilio message SID in notification.payload
        → on 400/401/403: permanent failure → dead_letter
        → on 429/5xx: retry
```

**Twilio status callback (optional for v1.1):**

Twilio can POST delivery status to a callback URL. If implemented, add `POST /webhooks/twilio/sms` route in API layer. This is the only new inbound webhook required for SMS. Implementation: look up notification by Twilio MessageSid stored in notification.payload, update status.

**Permanent error codes for SMS:**

| Error | Treatment |
|-------|-----------|
| 401 Unauthorized | Permanent (bad credentials) |
| 400 + error codes 21211, 21614 (invalid number) | Permanent |
| 400 + error code 21612 (unsubscribed) | Permanent |
| 429 Too Many Requests | Retriable |
| 5xx | Retriable |

**Retry policy:** 5 retries, 30s initial, exponential backoff, max 3600s — match EMAIL_RETRY pattern.

---

### Feature 3: Push Notifications (FCM/APNs)

**What it is:** A channel that sends push notifications to mobile/web via Firebase Cloud Messaging (Android + web) and Apple Push Notification service (iOS). Uses device registration tokens stored per-subscriber. The most architecturally complex new feature because it requires token storage with multiple-token-per-subscriber semantics.

**Integration points:**

| Touch point | Change type | Details |
|-------------|-------------|---------|
| `step_runner._handle_channel()` | MODIFY | Add `elif channel == "push"` branch |
| `celery_app.task_routes` | MODIFY | Add `push` queue |
| `celery_app.imports` | MODIFY | Add `channels.push` module |
| `notifications.py` task_map/queue_map | MODIFY | Add `"push"` entries |
| `channels/push.py` | NEW FILE | Deliver task |
| `utils/retry.py` | MODIFY | Add `PUSH_RETRY` policy |
| `subscribers` table | MODIFY | Need push token storage |
| `push_tokens` table | NEW TABLE | Stores per-device FCM/APNs tokens |
| `providers` table | MODIFY (data) | `channel='push'` rows with FCM service account JSON and APNs key |

**Push token schema (new table required):**

Multiple-token-per-subscriber is fundamental — one subscriber can have multiple devices. The existing flat `subscribers` table model (one value per field) cannot handle this. A separate table is required.

```sql
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id),
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL,  -- 'fcm', 'apns'
    device_id VARCHAR(255),         -- optional client-provided device identifier
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, token)          -- a token is unique globally (not per-subscriber)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_subscriber
    ON push_tokens(subscriber_id, platform) WHERE is_active = true;
```

**Push token registration API (new endpoint):**

```
POST /subscribers/{external_id}/push-tokens
Body: { "token": "fcm_token_here", "platform": "fcm", "device_id": "optional" }
Response: 201 Created

DELETE /subscribers/{external_id}/push-tokens/{token}
Response: 204 No Content
```

**FCM delivery (firebase-admin SDK):**

```python
import firebase_admin
from firebase_admin import messaging

# alrt-hosted: service account JSON from env FIREBASE_SERVICE_ACCOUNT_JSON
# byoc: service account JSON encrypted in providers.config

app = firebase_admin.initialize_app(credential, name=team_id)
message = messaging.MulticastMessage(
    tokens=tokens,  # list of active FCM tokens for subscriber
    notification=messaging.Notification(title=title, body=body),
    data={"payload": json.dumps(payload)},
)
response = messaging.send_each_for_multicast(message, app=app)
# Mark invalid tokens as is_active=False based on response.responses
```

**APNs delivery (pyapns-client or direct HTTP/2):**

APNs requires HTTP/2 persistent connections and JWT provider tokens. For v1.1 scope, recommend FCM-first (covers Android + web); APNs via separate task path for iOS tokens. Both route through the same `push` Celery queue. The `push_tokens.platform` field routes to the correct sender.

**Token invalidation pattern:**

FCM and APNs both return per-token error codes for invalid/unregistered tokens. The deliver task must:
1. On `messaging.UnregisteredError` or `UNREGISTERED` status: set `push_tokens.is_active = false`
2. Silently discard (not DLQ) — invalid tokens are expected after users reinstall apps

**Push delivery data flow:**

```
step_runner._handle_channel("push")
    → push.deliver.delay(execution_id, subscriber_id, team_id, template_data, payload)
        → load active push_tokens for subscriber (platform IN ('fcm', 'apns'))
        → if no tokens: log warning + return (not an error)
        → load push provider for team
        → partition tokens by platform
        → FCM tokens: send_each_for_multicast via firebase-admin
        → APNs tokens: POST to api.push.apple.com/3/device/{token} per token
        → for each failure: check if permanent (unregistered → deactivate token)
        → mark notification sent/failed based on response
```

---

### Feature 4: Smart Routing Engine

**What it is:** Logic that runs at step execution time (in `step_runner._handle_channel`) to implement: (1) subscriber channel preferences already honoured, (2) priority-based channel selection, and (3) fallback chains — if primary channel fails or subscriber lacks credentials, try next channel automatically.

This is the most architecturally invasive feature because it changes the execution contract of `_handle_channel`. Currently: one node = one channel attempt. With routing: one node = try channel A, on failure try B, etc.

**Integration points:**

| Touch point | Change type | Details |
|-------------|-------------|---------|
| `step_runner._handle_channel()` | MODIFY (significant) | Must support fallback chain execution |
| `workflow.py` BFS walker | POSSIBLY MODIFY | May need to handle routing-level results |
| `step_runner.execute_step` | POSSIBLY MODIFY | Result semantics change |
| New `routing_engine.py` | NEW FILE | Extracted routing logic — preference check, priority sort, fallback loop |
| Workflow node schema | NEW | `"type": "router"` node OR routing config added to channel node data |
| `channels/*/deliver` tasks | NO CHANGE | Deliver tasks stay identical — routing is above them |

**Two possible architecture approaches:**

**Option A: Router as a new node type (recommended)**

Add a `router` node type to the workflow graph. When `execute_step` encounters a `router` node, it calls `routing_engine.execute_routing(...)` which:
1. Reads the router node's `channels` list (ordered priority)
2. For each channel in order, checks if subscriber has credentials for that channel
3. Attempts delivery — enqueues the channel task and waits for result (or uses synchronous check)
4. On success: done. On failure: try next.

This approach keeps `_handle_channel` clean and makes routing explicit in the workflow definition.

```
Workflow graph:
  trigger → router(channels=["sms", "email", "in_app"]) → end

Router node data:
{
  "type": "router",
  "data": {
    "channels": ["sms", "email", "in_app"],  // priority order
    "strategy": "fallback",                   // or "all" (fan-out)
    "timeout_seconds": 30                     // per-channel attempt timeout
  }
}
```

**Option B: Routing config embedded in channel node**

Adds `fallback_to` field to existing channel nodes. Step runner checks if channel deliver succeeded and tries fallback if not.

This is simpler but makes the workflow graph less explicit and creates implicit execution paths.

**Recommendation: Option A** — it is explicit in the graph, easier to debug in the activity feed, and more powerful (supports both fallback and fan-out strategies without coupling to a single channel type).

**Router node execution flow:**

```
execute_step(node_type="router")
    → routing_engine.execute_routing(
          execution_id, node, subscriber_id, team_id, payload, preferences
      )
        → channel_list = node["data"]["channels"]  # e.g. ["sms", "email", "in_app"]
        → for channel in channel_list:
            1. check subscriber has required field for channel
               (phone_number for sms/whatsapp, email for email, etc.)
            2. check subscriber preferences allow channel
            3. enqueue channel deliver task → get notification_id
            4. if strategy == "fallback":
               → wait up to timeout_seconds for delivery status
               → if status == "sent": return "ok"
               → if status == "failed": continue to next channel
            5. if strategy == "all": enqueue all, don't wait
        → if all channels exhausted: mark routing as failed
```

**Fallback timeout implementation:**

The main challenge: Celery tasks are async. Step runner runs synchronously in the workflow worker. Waiting for a channel delivery result requires either:

1. **Polling pattern** (simplest): After enqueuing, poll notification status in DB with sleep loop (check every 5s, up to timeout). Works within existing architecture.

2. **Celery chord** (complex): Use `chord([deliver.s(...)], callback.s(...))`. More elegant but requires Celery result backend to be reliable.

**Recommendation: Polling pattern for v1.1.** It fits existing architecture (synchronous step_runner, asyncpg worker db) and avoids chord complexity. For 30s timeout with 5s polling = 6 checks max. Acceptable overhead.

```python
# In routing_engine.py
def _wait_for_delivery(notification_id: str, timeout: int = 30) -> str:
    """Poll notification status until sent/failed or timeout."""
    import time
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        row = execute_read_one_query(Q_GET_NOTIFICATION_STATUS, [uuid.UUID(notification_id)])
        if row and row["status"] in ("sent", "failed", "dead_letter"):
            return row["status"]
        time.sleep(5)
    return "timeout"
```

**Preference check integration:**

The existing preference check logic in `_handle_channel` is already correct. Extract it to a shared `_check_preferences(channel, preferences, workflow_category, subscriber_id, team_id)` function in step_runner (or routing_engine) so it can be called from both the direct channel path and the router path without duplication.

**New workflow builder components for router:**

Dashboard router node: shows channel priority list, drag-to-reorder, strategy toggle (fallback/fan-out), timeout slider. Internally stores as the router node data structure above.

---

## Component Boundaries: What Stays vs. What Changes

### Files with NO changes required

These are load-bearing existing components. Touch them only for the minimal `elif` additions.

| File | Why no change needed |
|------|---------------------|
| `workflow.py` | BFS walk handles any node type including new `router` via `execute_step` |
| `delay.py` | Scheduling pattern unchanged; router nodes don't introduce new delay semantics |
| `celery_app.py beat_schedule` | No new Beat tasks needed for v1.1 |
| `db.py` (API) | Query helpers are generic; no change |
| `workers/db.py` | Same — generic helpers |
| `utils/crypto.py` | Fernet pattern already works for all provider types |
| `utils/template.py` | `render()` works for all new channels — no changes |

### Files requiring minimal modification (add lines, don't restructure)

| File | Change | Risk |
|------|--------|------|
| `step_runner.py` | Add `elif channel == "sms"/"webhook"/"push"` branches + extract preference check | LOW |
| `celery_app.py` | Add task_routes + imports entries | LOW |
| `notifications.py` | Add entries to `task_map` + `queue_map` dicts | LOW |
| `utils/retry.py` | Add `SMS_RETRY`, `WEBHOOK_RETRY`, `PUSH_RETRY` dataclass instances | LOW |

### Files requiring moderate modification (new logic, same shape)

| File | Change | Risk |
|------|--------|------|
| `schema.sql` | New `push_tokens` table + indexes | MEDIUM (migration care) |
| `routes/subscribers.py` | New push-token register/delete endpoints | LOW |
| `queries/subscribers.py` | New push token SQL constants | LOW |

### New files (follow existing channel file shape)

| File | Template | Risk |
|------|----------|------|
| `channels/webhook.py` | Discord pattern (httpx.post, HMAC signing, permanent codes) | LOW |
| `channels/sms.py` | Email pattern (provider lookup, alrt_hosted vs BYOC, retry) | LOW |
| `channels/push.py` | New pattern (multi-token loop, firebase-admin, token invalidation) | MEDIUM |
| `tasks/routing_engine.py` | New (preference check extract + fallback loop + polling) | MEDIUM |

---

## Data Flow Changes

### Current flow (v1.0)

```
trigger → execution → workflow.execute → step_runner.execute_step
    → _handle_channel(channel_name)
        → if channel == "email": email.deliver.delay(...)
        → (notification in DB, mark sent/failed)
```

### New flow with router node (v1.1)

```
trigger → execution → workflow.execute → step_runner.execute_step
    → node_type == "channel": _handle_channel(channel_name)  [unchanged]
    → node_type == "router":  routing_engine.execute_routing(node)
        → for channel in priority_list:
            → check subscriber has credentials
            → check preferences
            → enqueue channel.deliver.delay(...)
            → if strategy == "fallback":
                → poll notification status (5s intervals, up to timeout)
                → if sent: break
                → if failed/timeout: try next channel
        → return "ok" if any channel succeeded, "skipped" if all failed
```

### Schema additions required

```sql
-- push_tokens table (new — multi-device token storage)
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id),
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('fcm', 'apns')),
    device_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_subscriber_active
    ON push_tokens(subscriber_id, platform) WHERE is_active = true;

-- notifications.channel column: add new values
-- 'webhook', 'sms', 'push' — no migration needed, VARCHAR(20) is unvalidated
-- Verify 'webhook', 'sms', 'push' all fit within 20 chars. They do.
```

---

## Build Order and Dependencies

The new features have explicit dependencies between them. Build in this order:

### Stage 1: Generic Webhooks (no new deps)

Webhooks are the core primitive and the simplest new channel. No new schema. Establishes the pattern for new channels. Build first.

**Deliverables:**
1. `channels/webhook.py` — deliver task with HMAC signing, retry, DLQ
2. `utils/retry.py` — add WEBHOOK_RETRY
3. `step_runner.py` — add webhook elif branch
4. `celery_app.py` — add webhook route + import
5. `notifications.py` — add webhook to task_map/queue_map
6. Dashboard — webhook node in workflow builder (URL, method, headers, body template)
7. Dashboard — webhook channel badge in activity feed

### Stage 2: SMS via Twilio (depends on Stage 1 patterns)

SMS follows the exact same worker pattern as webhook. `phone_number` already in subscriber schema. Build second.

**Deliverables:**
1. `channels/sms.py` — deliver task with Twilio httpx integration, alrt_hosted vs BYOC
2. `utils/retry.py` — add SMS_RETRY
3. `step_runner.py` — add sms elif branch
4. `celery_app.py` — add sms route + import
5. `notifications.py` — add sms to task_map/queue_map
6. Env config — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
7. Provider row — alrt_hosted SMS provider provisioned on signup (like email)
8. Dashboard — SMS node in workflow builder
9. Optional: `POST /webhooks/twilio/sms` for delivery status callbacks

### Stage 3: Push Notifications (depends on schema migration)

Push requires the new `push_tokens` table. Build third. Highest implementation complexity.

**Deliverables:**
1. `schema.sql` — push_tokens table + indexes
2. `routes/subscribers.py` — POST/DELETE /subscribers/{id}/push-tokens endpoints
3. `queries/subscribers.py` or `queries/push_tokens.py` — SQL constants
4. `channels/push.py` — deliver task with FCM (firebase-admin) + APNs (HTTP/2) + token invalidation
5. `utils/retry.py` — add PUSH_RETRY
6. `step_runner.py` — add push elif branch
7. `celery_app.py` — add push route + import
8. `notifications.py` — add push to task_map/queue_map
9. Env config — FIREBASE_SERVICE_ACCOUNT_JSON
10. Dashboard — push node in workflow builder (title, body, data)

### Stage 4: Smart Routing Engine (depends on Stages 1-3)

The routing engine is most valuable when multiple channels exist to route between. Build last. Can use any combination of existing + new channels.

**Deliverables:**
1. `tasks/routing_engine.py` — preference check extract, fallback loop, polling helper
2. `step_runner.py` — add `elif node_type == "router"` branch
3. Dashboard — router node in workflow builder (channel priority list, strategy toggle, timeout config)
4. Dashboard — router result visualization in activity feed (which channel was used)

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Provider State in Celery Tasks

**What people do:** Initialize firebase-admin app once at module level in `channels/push.py` using a global `firebase_admin.initialize_app()`.

**Why it's wrong:** Firebase admin app initialization is per-credential. With multiple teams using BYOC Firebase projects, each team needs their own app instance. Module-level state means the first team's credentials win.

**Do this instead:** Initialize per-team app lazily using `firebase_admin.get_app(team_id)` with a try/except to create if not exists. Use `team_id` as the app name parameter.

```python
def _get_firebase_app(team_id: str, credential):
    try:
        return firebase_admin.get_app(name=team_id)
    except ValueError:
        return firebase_admin.initialize_app(credential, name=team_id)
```

### Anti-Pattern 2: Synchronous Webhook Delivery in API Layer

**What people do:** To avoid the Celery overhead for "simple" webhook delivery, call the webhook URL directly from the FastAPI route handler.

**Why it's wrong:** The API response time becomes dependent on the subscriber's server response time. A slow or down external server causes the trigger endpoint to hang. Bulk webhooks would block all other requests.

**Do this instead:** All delivery is async via Celery — even webhooks. The trigger endpoint returns 202 Accepted immediately. The webhook.deliver task handles the HTTP call with its own timeout and retry logic.

### Anti-Pattern 3: Blocking Fallback Wait in BFS Walker

**What people do:** Put the fallback polling loop inside `workflow.py`'s BFS walk instead of in `routing_engine.py`.

**Why it's wrong:** The BFS walker is the orchestrator. Blocking it for 30 seconds per router node blocks the entire workflow execution thread, preventing other workflows from running on that worker.

**Do this instead:** Keep the BFS walker non-blocking. The routing engine's polling runs in the context of the `workflow.execute` Celery task (which is already dedicated to one execution), not in a shared context. This is acceptable — one worker thread per workflow execution is the existing design. But isolate this polling logic cleanly in `routing_engine.py`, not mixed into `workflow.py`.

### Anti-Pattern 4: Storing Push Tokens in Subscriber Custom Properties

**What people do:** Store push tokens in `subscribers.custom_properties JSONB` to avoid a schema migration.

**Why it's wrong:** One subscriber can have multiple devices, each with different tokens, platforms, and activity states. JSONB is a poor fit for a list with per-element invalidation semantics. Token invalidation (marking one device token stale without affecting others) requires a row-level operation, not a JSONB patch.

**Do this instead:** The `push_tokens` table is required. The migration is safe (additive table creation) and indexes keep lookups fast.

### Anti-Pattern 5: Webhook URL Hardcoded in Template Data

**What people do:** Store the webhook URL directly in the workflow node's template data (same as message body content), so it goes through the template render pipeline.

**Why it's wrong:** URLs contain special characters and sometimes secrets. Template rendering with `{{variable}}` interpolation should not run on security-sensitive config like URLs and secrets. Renders can fail silently, producing malformed URLs.

**Do this instead:** Store webhook URL and headers in node config (not template data). Template rendering applies only to the request body. URL is used verbatim.

---

## Integration Points: External Services

| Service | Integration Method | Credentials | Notes |
|---------|-------------------|-------------|-------|
| Twilio SMS | REST API via httpx (no SDK needed) | account_sid, auth_token | SDK (twilio-python) is optional — direct HTTP is simpler for Celery context |
| Firebase FCM | firebase-admin Python SDK | service account JSON | HTTP v1 API; SDK handles OAuth token refresh automatically |
| Apple APNs | HTTP/2 via httpx (with h2 extra) OR pyapns-client | .p8 key, key_id, team_id | JWT provider tokens; requires HTTP/2 client |
| Client webhook endpoints | httpx.post | HMAC secret per webhook | External URLs — expect variable reliability |

### Internal Boundaries After v1.1

| Boundary | Communication | Notes |
|----------|---------------|-------|
| API → Routing Engine | None (routing happens in workers) | Trigger API unchanged; routing is worker-only |
| step_runner → routing_engine | Direct function call | routing_engine.execute_routing() is synchronous |
| routing_engine → channel tasks | `deliver.delay()` → Redis queue | Same as existing channel dispatch |
| routing_engine → DB (status poll) | execute_read_one_query() | Sync wrapper via workers/db.py |
| push.deliver → firebase-admin | Library call (not HTTP) | firebase-admin abstracts FCM HTTP v1 |
| subscribers API → push_tokens table | asyncpg query | New endpoints, same query pattern |

---

## Scaling Considerations

| Scale | Architecture adjustment |
|-------|------------------------|
| Current (<10k/day) | All features work in current architecture without change. Push multicast handles batching automatically. |
| 10k-100k/day | Add dedicated `push` worker process with higher concurrency (`--concurrency 8`). Webhook delivery may need rate-limiting per destination domain to avoid overwhelming subscriber servers. |
| 100k+/day | Push token table needs partitioning by team_id. Routing engine polling loop becomes a bottleneck — consider Celery canvas (chord) instead. Webhook delivery needs per-domain circuit breakers. |

**First bottleneck for smart routing:** The 30-second polling loop in routing engine. At high volume, workers spend CPU time sleeping. Fix path: replace polling with a Celery chord callback or a dedicated "routing monitor" Beat task.

**First bottleneck for push:** FCM multicast handles up to 500 tokens per request, so most subscribers are fine. Bottleneck appears at teams with 500+ devices per subscriber (unlikely for B2B startup use case).

---

## Sources

**Existing codebase (ground truth — HIGH confidence):**
- `apps/workers/alrt_workers/tasks/step_runner.py` — channel dispatch, preference checks
- `apps/workers/alrt_workers/tasks/channels/discord.py` — pattern for new webhook-based channels
- `apps/workers/alrt_workers/tasks/channels/email.py` — pattern for BYOC provider channels
- `apps/workers/alrt_workers/celery_app.py` — queue routing, imports, Beat schedule
- `apps/api/alrt/routes/notifications.py` — DLQ retry task_map/queue_map
- `schema.sql` — existing table structure and column types

**External documentation (MEDIUM confidence — verified via search):**
- [Twilio Python SDK — GitHub](https://github.com/twilio/twilio-python) — REST client, messages.create pattern
- [Twilio Messaging Webhooks](https://www.twilio.com/docs/usage/webhooks/messaging-webhooks) — status callback patterns
- [Firebase Admin SDK — send_each_for_multicast](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) — FCM multicast, token invalidation
- [Apple APNs token-based connection](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns) — HTTP/2 JWT provider tokens
- [Standard Webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) — HMAC-SHA256 signing standard
- [PyAPNs2](https://github.com/Pr0Ger/PyAPNs2) — Python APNs HTTP/2 library

---

*Architecture research for: Alrt v1.1 — webhooks, SMS, push, smart routing integration*
*Researched: 2026-03-06*
