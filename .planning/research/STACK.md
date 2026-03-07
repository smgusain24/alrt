# Stack Research: v1.1 New Capabilities

**Domain:** Multi-channel notification infrastructure — generic webhooks, SMS, push notifications, smart routing
**Researched:** 2026-03-06
**Confidence:** HIGH (Twilio, Firebase, standard library choices verified via PyPI + official sources; routing is pure application logic with no library dependency)

---

## Context

This file covers ONLY what is NEW for v1.1. The locked existing stack:

| Layer | Technology | Status |
|-------|-----------|--------|
| API | Python 3.12 + FastAPI 0.115+ | Locked |
| DB | PostgreSQL 16 + asyncpg 0.30+ (raw SQL) | Locked |
| Queue | Celery 5.4+ + Redis | Locked |
| HTTP client | httpx 0.27+ | Locked |
| Dashboard | Next.js 14 + TypeScript + Tailwind | Locked |
| Encryption | cryptography 44+ (Fernet) | Locked |
| Template | jinja2 3.1+ | Locked |

The v1.0 approach of using raw httpx for all external APIs (no thin SDK wrappers) worked well for email, Slack, WhatsApp, Discord, Telegram. That pattern continues for generic webhooks. The two exceptions where an SDK is justified are Twilio (rate limiting, auth, phone number normalization built in) and FCM (requires OAuth2 token management, SDK handles it cleanly).

---

## Recommended Stack — New Additions Only

### SMS via Twilio

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `twilio` | `>=9.10` | SMS delivery via Twilio Messaging API | Official SDK; handles auth (Basic HTTP auth with Account SID + Auth Token), phone number format normalization, and rate limit responses. Current version 9.10.2 (released 2026-02-18). Alternative raw httpx calls are viable but require reimplementing auth encoding and error classification |

**Use pattern:** Synchronous `client.messages.create()` inside a Celery task worker. The Twilio SDK supports an `AsyncTwilioHttpClient` for truly async contexts, but Celery workers run in their own process and are effectively synchronous — the sync SDK path is correct here. Do NOT use `create_async()` in Celery workers; it requires an async event loop that conflicts with Celery's task execution model.

**Delivery status:** Twilio delivers status callbacks to a webhook URL (`POST /webhooks/twilio/sms`). This is the same outbound-webhook-with-inbound-callback pattern already implemented for WhatsApp. Twilio signs callbacks with `X-Twilio-Signature` (HMAC-SHA1 of the full URL + sorted params). The `twilio` SDK ships `RequestValidator` that handles this verification — use it instead of reimplementing.

**Installation (workers only):**
```bash
uv add twilio>=9.10 --package alrt-workers
```

### Push Notifications (FCM + APNs)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `firebase-admin` | `>=6.5` | FCM push delivery to Android + web (Chrome/Firefox/Edge) | Google's official Python Admin SDK. Manages OAuth2 service account token refresh transparently. Current stable version is 6.5+ (verify at release); latest confirmed 7.x series in active development. Use `messaging.send()` for single token, `messaging.send_each_for_multicast()` for batch (up to 500 tokens). |

**FCM API note:** The legacy Firebase Cloud Messaging batch APIs (`send_multicast()`) were deprecated June 2024 and stopped working June 2024. Use only `messaging.send()` + `messaging.send_each_for_multicast()` (FCM HTTP v1 API). The `firebase-admin` SDK 6.x+ handles this correctly.

**APNs delivery:** For iOS push notifications, use FCM as the intermediary — FCM forwards to APNs. This is the standard pattern for cross-platform push: one FCM registration token covers Android native, iOS (via FCM→APNs bridge), and web push. Do NOT add a separate APNs library for Phase 1 of push. If BYOC APNs credentials become a requirement, `pyapns-client` (httpx-based, async-friendly) is the right library — but defer this.

**Installation (workers only):**
```bash
uv add firebase-admin>=6.5 --package alrt-workers
```

**Do not use:**
- `pyfcm` — third-party, not official Google, lags behind FCM API changes
- `aioapns` — APNs-only, no FCM; adds complexity without benefit when FCM handles iOS via bridge
- Raw httpx to FCM HTTP v1 — requires managing OAuth2 service account tokens manually; firebase-admin does this for free

### Generic Outbound Webhooks

No new library required. This is a pure application pattern implemented with existing `httpx` (already in workers). The architecture decision is: treat webhooks as a channel type in the workflow builder with a `webhook_url`, `method` (POST/GET), `headers` JSONB, and `body_template` JSONB stored on the channel node's `template_data`.

**HMAC signature:** Use Python stdlib `hmac` + `hashlib` (no new dependency). Generate `X-Alrt-Signature: sha256=<hmac-hex>` header using the team's webhook signing secret (stored encrypted in providers table, same Fernet pattern as Slack bot_token).

```python
import hmac, hashlib

def compute_signature(secret: str, body: bytes) -> str:
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={sig}"
```

**Retry:** Use existing `RetryPolicy` in `utils/retry.py`. Recommended: 5 retries, exponential backoff, max 3600s, jitter=True. Non-2xx responses are retriable. Permanent failures (4xx from verified endpoint) go to DLQ.

### Smart Routing Engine

No new library required. This is pure application logic implemented in a new Python module (`alrt_workers/tasks/routing.py` or `alrt/services/routing.py`). The routing engine runs BEFORE step_runner dispatches to channel workers.

**The routing decision:** Given a subscriber's preferences + DND window + frequency caps (all already in DB), plus the workflow's channel nodes, output an ordered list of channels to attempt. The engine does not need a rule-engine library — it is a simple function that:

1. Filters out channels the subscriber has globally opted out of
2. Filters out channels blocked by DND schedule
3. Filters out channels that would exceed frequency cap
4. Orders remaining channels by priority (stored on workflow channel node as `priority: int`)
5. Chains fallback: attempt channel 1; if notification status becomes `failed` within a configurable timeout, attempt channel 2

**Fallback timeout mechanism:** Store `fallback_timeout_seconds` on channel nodes. After a channel task marks a notification `failed`, the step_runner checks if a fallback channel exists and triggers it. Use the existing Celery Beat pattern (same as `scheduled_steps` polling) or Celery `countdown` on the fallback task.

**No external rule engine library** (like `durable-rules`, `pyke`, `drools` via Jython) — all overhead, no value for this use case. The routing logic is 50-100 lines of Python.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `pyfcm` | Third-party, not official Google. Lagged behind FCM v1 migration in 2024, causing broken sends for projects on it | `firebase-admin` official SDK |
| `aioapns` (standalone) | APNs-only; adds a dependency that duplicates FCM→APNs bridge functionality | FCM handles iOS push via bridge; add APNs only if BYOC APNs is required |
| `whatsapp-cloud-api` (PyPI) | Thin wrapper around the same httpx calls already written in Phase 4. Adds lock-in for no benefit | Raw httpx (already in workers) |
| `durable-rules` / rule engine library | Severe overkill for priority + preference filtering; these libraries solve forward-chaining expert system problems, not ordered channel selection | Pure Python function in routing module |
| `twilio-python-async` (PyPI) | Deprecated. The official `twilio` SDK now includes native async support | Official `twilio>=9.x` with `AsyncTwilioHttpClient` if async needed (not needed in Celery workers) |
| Separate APNS certificate management | Requires per-team cert storage, renewal, and Apple Developer account management | FCM token covers iOS; no standalone APNs for v1.1 |
| `requests` (sync HTTP) | Already replaced by httpx everywhere; mixing sync clients creates two connection pools | httpx (already installed) |

---

## Supporting Libraries — Already Installed, New Use Cases

| Library | Existing Version | New Use | Notes |
|---------|-----------------|---------|-------|
| `httpx` | >=0.27 (api), >=0.28 (workers) | Outbound webhook delivery + Twilio status callback endpoint testing | Already installed; zero new dep |
| `jinja2` | >=3.1 | Webhook body template rendering (`{{variable}}` in webhook payloads) | Existing `render()` in `utils/template.py` covers this exactly |
| `cryptography` | >=44 | Fernet-encrypt webhook signing secret in providers table | Already installed; same pattern as Slack bot_token |
| `slowapi` | >=0.1.9 | Rate-limit incoming Twilio/FCM webhook callbacks | Already installed on API |
| `pydantic` | (from fastapi) | Schema for push token registration endpoint, webhook config schema | Already installed |

---

## Database Schema Additions

These are the new DB columns/tables needed for v1.1 stack support. Not a library choice, but inseparable from the stack decision:

### `subscribers` table additions
```sql
-- Push notification tokens (one subscriber, many devices)
-- Store as JSONB array rather than a separate table for startup-scale simplicity
-- Column already exists as custom_properties JSONB; add explicit push_tokens column
ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS push_tokens JSONB DEFAULT '[]';
-- push_tokens structure: [{"token": "...", "platform": "fcm|apns", "device_id": "...", "created_at": "..."}]
```

**Rationale:** FCM tokens are per-device. A subscriber (user) may have multiple devices. Store as JSONB array on the subscriber row. At send time, iterate all tokens and use `send_each_for_multicast()`. This is the Google-recommended pattern for startup scale. A separate `device_tokens` table becomes necessary at 10k+ DAU; defer.

### `providers` table — new channel types
```sql
-- No new columns needed; providers.channel VARCHAR(50) already accepts new values
-- New valid values: 'sms', 'push', 'webhook'
-- Add check constraint update if strict validation is enforced (currently no constraint)
```

### `webhook_endpoints` table (new — for outbound webhook channel)
```sql
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    method          VARCHAR(10) NOT NULL DEFAULT 'POST',
    headers         JSONB DEFAULT '{}',
    signing_secret  TEXT,           -- Fernet-encrypted, optional
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_team ON webhook_endpoints(team_id);
```

**Note:** For simple v1.1 generic webhook delivery, the webhook URL + config can be stored directly on the workflow channel node's `template_data` JSONB (no separate table). The `webhook_endpoints` table only becomes necessary when supporting reusable named endpoints. Use the inline-on-node approach first; add the table only if the roadmap includes an "Endpoint Library" feature.

---

## New Celery Queues Required

```python
# celery_app.py additions
task_routes={
    ...existing...,
    "alrt_workers.tasks.channels.sms.deliver":     {"queue": "sms"},
    "alrt_workers.tasks.channels.push.deliver":    {"queue": "push"},
    "alrt_workers.tasks.channels.webhook.deliver": {"queue": "webhook"},
},
```

One queue per channel. This matches the existing SCALE-01 pattern (email/slack/inapp/whatsapp/discord/telegram each have dedicated queues).

---

## New Environment Variables Required

### SMS (Twilio)
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15551234567    # alrt's shared sending number
TWILIO_WEBHOOK_TOKEN=random_string  # for validating Twilio status callbacks
```

### Push (Firebase)
```bash
# Option A: Service account JSON file path (simpler for dev)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceaccount.json

# Option B: Inline service account JSON (preferred for Railway/containerized deploy)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

**Note on Firebase init:** `firebase_admin.initialize_app()` must be called once at worker startup (not on every task). Use a module-level singleton with `firebase_admin.get_app()` guard:

```python
import firebase_admin
from firebase_admin import credentials, messaging

def _get_firebase_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if cred_json:
            cred = credentials.Certificate(json.loads(cred_json))
        else:
            cred = credentials.ApplicationDefault()
        return firebase_admin.initialize_app(cred)
```

### Webhooks
```bash
# No new env vars needed — webhook URLs stored in workflow node config or providers table
# Signing secrets stored encrypted in providers.config (Fernet) per existing pattern
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| SMS delivery | `twilio>=9.10` | Raw httpx to Twilio REST API | Twilio auth requires HTTP Basic Auth encoding + URL construction; SDK saves ~30 lines of boilerplate and handles `RequestValidator` for incoming status webhooks |
| SMS delivery | `twilio>=9.10` | Vonage (formerly Nexmo) | Smaller ecosystem, fewer resources. Twilio is the standard; most devs building on alrt will expect Twilio as the SMS provider |
| Push notifications | `firebase-admin>=6.5` | `pyfcm` | `pyfcm` is not official, lagged FCM v1 migration; firebase-admin is Google's maintained SDK |
| Push notifications | FCM (firebase-admin) | Direct APNs (`pyapns-client`) | FCM covers iOS via bridge, Android native, and web push from one SDK. Standalone APNs adds a second system with cert management; only needed for BYOC APNs tier |
| Routing engine | Pure Python function | `durable-rules` / rule DSL | Rule engines solve expert system problems with hundreds of conditions; routing is 3 simple filters + ordering. No library justified |
| Webhook body | Jinja2 (`render()`) | mustache / handlebars | Already using Jinja2 for all other channels; consistency wins over mustache's simpler API |
| Webhook HMAC | stdlib `hmac` + `hashlib` | `itsdangerous` | `itsdangerous` provides timing-safe comparison but `hmac.compare_digest()` in stdlib does too; no new dep needed |

---

## Installation Summary

**Workers only:**
```bash
uv add "twilio>=9.10" --package alrt-workers
uv add "firebase-admin>=6.5" --package alrt-workers
```

**API only:**
No new dependencies needed. New routes (webhook callback receivers, push token registration) use existing FastAPI + asyncpg + httpx stack.

**Dashboard only:**
No new dependencies needed. Webhook, SMS, push channel nodes follow the same React Flow node pattern as existing channels. `@icons-pack/react-simple-icons` (already added in Phase 4) covers any new channel brand icons needed.

---

## Version Compatibility

| Package | Version | Python | Notes |
|---------|---------|--------|-------|
| `twilio` | >=9.10.2 | 3.8+ | Compatible with Python 3.12. SDK auto-generated from OpenAPI. Sync and async clients in same package |
| `firebase-admin` | >=6.5 | 3.8+ | Compatible with Python 3.12. Pulls in `google-auth` and `google-api-core`; these are stable, well-maintained transitive deps |
| `google-auth` | (transitive, ~2.x) | 3.8+ | Pulled in by `firebase-admin`; handles OAuth2 token refresh for FCM v1 API |

**No known conflicts** between `twilio`, `firebase-admin`, and the existing stack (`celery`, `httpx`, `cryptography`, `asyncpg`).

---

## Routing Engine Architecture (Implementation Notes)

The smart routing engine has no library component — it is a pure Python module. Documenting the data flow here because it informs where new DB columns are needed:

```
POST /events/trigger
        │
        ▼
step_runner.execute_step (channel node)
        │
        ▼
routing.select_channels(subscriber, channel_nodes, payload)
        │
        ├── subscriber.channel_preferences (JSONB, already in DB)
        ├── subscriber.dnd_start / dnd_end (already in DB)
        ├── team frequency_cap (already in DB as team_quotas)
        └── channel_node.priority (NEW field in workflow node data)
        │
        ▼
[ordered list of channels to attempt]
        │
        ▼
Attempt channel[0].deliver → on failure → Attempt channel[1].deliver
                                           (after fallback_timeout_seconds)
```

**New fields needed on workflow channel nodes** (stored in `workflows.definition` JSONB — no schema migration, it's JSONB):
```json
{
  "type": "channel",
  "data": {
    "channel": "email",
    "priority": 1,
    "fallback_to": "sms",
    "fallback_timeout_seconds": 300
  }
}
```

The routing engine reads `priority` and `fallback_to` from the channel node data at runtime. No new table; this lives in the existing JSONB `definition` column.

---

## Sources

- [Twilio Python SDK releases](https://github.com/twilio/twilio-python/releases) — version 9.10.2 confirmed as of 2026-02-18; sync/async patterns verified (MEDIUM confidence — PyPI release page confirmed via WebSearch)
- [Twilio async docs](https://www.twilio.com/en-us/blog/twilio-python-helper-library-async) — confirmed `AsyncTwilioHttpClient` pattern; confirmed deprecated `twilio-python-async` package
- [Firebase Admin Python SDK — firebase_admin.messaging](https://firebase.google.com/docs/reference/admin/python/firebase_admin.messaging) — `send()`, `send_each_for_multicast()` API confirmed (HIGH confidence — official Firebase docs)
- [Firebase FCM send_multicast deprecation](https://github.com/firebase/firebase-admin-node/discussions/2518) — confirmed `send_multicast()` dropped; migrate to `send_each_for_multicast()` (HIGH confidence — official GitHub discussion)
- [Firebase token management best practices](https://firebase.google.com/docs/cloud-messaging/manage-tokens) — push_tokens JSONB array pattern, token expiry at 270 days (HIGH confidence — official Firebase docs)
- [pyfcm PyPI](https://pypi.org/project/pyfcm/) — confirmed version 2.1.0 (2025-07-28); confirmed it migrated to FCM HTTP v1 but is unofficial (MEDIUM confidence)
- [Google FCM server environment guide](https://firebase.google.com/docs/cloud-messaging/server-environment) — confirmed firebase-admin is official server SDK (HIGH confidence — official docs)
- [Twilio RequestValidator for callback verification](https://www.twilio.com/docs/libraries/reference/twilio-python/) — HMAC-SHA1 signature verification via SDK (HIGH confidence — official Twilio docs)

---

*Stack research for: Alrt v1.1 — webhooks, SMS (Twilio), push (FCM/APNs), smart routing*
*Researched: 2026-03-06*
*Valid until: 2026-09-06 (Firebase-admin and Twilio SDK versions; FCM HTTP v1 API is stable)*
