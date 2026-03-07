# Pitfalls Research

**Domain:** Multi-channel notification infrastructure — adding generic webhooks, SMS (Twilio), intelligent routing engine, and push notifications (FCM/APNs) to an existing 6-channel system
**Researched:** 2026-03-06
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: SSRF via User-Supplied Webhook URLs

**What goes wrong:**
When teams register outbound webhook URLs (e.g., `https://internal-service/admin` or `http://169.254.169.254/latest/meta-data/`), the Celery worker that POSTs to those URLs will faithfully make the request to cloud metadata endpoints, internal network addresses, or localhost — leaking secrets or bypassing network controls.

**Why it happens:**
Generic webhooks require storing URLs provided by the customer and later POSTing to them from the backend. Developers add URL validation at the API layer (checking `http://` vs `https://`) but forget that a valid-looking public domain can DNS-resolve to an RFC-1918 private IP after validation (DNS rebinding). The time-of-check vs time-of-use gap makes URL schema validation alone insufficient.

**How to avoid:**
At webhook delivery time in the Celery worker, validate the resolved IP before connecting:
1. Resolve the hostname to an IP address using `socket.getaddrinfo()`.
2. Reject IPs in RFC-1918 ranges (`10.x`, `172.16-31.x`, `192.168.x`), loopback (`127.x`, `::1`), link-local (`169.254.x`), and cloud metadata (`169.254.169.254`).
3. Use `httpx` with a custom transport that pins the pre-resolved IP to prevent DNS rebinding between validation and connection.
4. Also enforce HTTPS-only for all webhook URLs.

```python
import socket
import ipaddress

BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]

def _validate_webhook_url(url: str) -> None:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError("Webhook URL must use HTTPS")
    hostname = parsed.hostname
    for _, _, _, _, sockaddr in socket.getaddrinfo(hostname, None):
        ip = ipaddress.ip_address(sockaddr[0])
        for blocked in BLOCKED_NETWORKS:
            if ip in blocked:
                raise ValueError(f"Webhook URL resolves to blocked IP range: {ip}")
```

**Warning signs:**
- Teams using localhost or internal service URLs during testing.
- Webhook delivery logs showing requests to `169.254.*` or `10.*` ranges.
- No IP validation step in the webhook worker task.

**Phase to address:** Webhook channel implementation phase — validate at both API registration time AND worker delivery time.

---

### Pitfall 2: The elif Chain Breaks at 8+ Channels

**What goes wrong:**
`step_runner.py`'s `_handle_channel()` function currently dispatches via `elif channel == "whatsapp": ... elif channel == "discord": ...`. Adding webhook, SMS, and push creates 9+ branches. Every new channel requires editing `step_runner.py` directly. A developer forgets to add the `elif` block for a new channel — the channel silently returns `"ok"` (the default fallthrough) without dispatching anything. No delivery, no error, no log entry.

**Why it happens:**
The bespoke pattern was reasonable for 2-3 channels but was not built to scale. The dispatch logic is not data-driven; it must be manually extended for each channel. There is no test that asserts "every registered channel type dispatches to a task."

**How to avoid:**
Replace the elif chain with a dictionary registry before the channel count grows further:

```python
# In step_runner.py — registry pattern
CHANNEL_REGISTRY: dict[str, str] = {
    "in_app":  "alrt_workers.tasks.channels.inapp.deliver",
    "email":   "alrt_workers.tasks.channels.email.deliver",
    "slack":   "alrt_workers.tasks.channels.slack.deliver",
    "whatsapp": "alrt_workers.tasks.channels.whatsapp.deliver",
    "discord": "alrt_workers.tasks.channels.discord.deliver",
    "telegram": "alrt_workers.tasks.channels.telegram.deliver",
    "sms":     "alrt_workers.tasks.channels.sms.deliver",
    "webhook": "alrt_workers.tasks.channels.webhook.deliver",
    "push":    "alrt_workers.tasks.channels.push.deliver",
}

def _dispatch_channel(channel, *args, **kwargs):
    task_path = CHANNEL_REGISTRY.get(channel)
    if not task_path:
        log.error(f"Unknown channel type: {channel}")  # Loud failure, not silent skip
        return "skipped"
    module_path, func_name = task_path.rsplit(".", 1)
    module = importlib.import_module(module_path)
    task = getattr(module, func_name)
    task.delay(*args, **kwargs)
    return "ok"
```

If refactoring the entire dispatch is deferred, at minimum add a defensive `else: log.error(f"No dispatch for channel {channel}")` to the current chain so unknown channels fail loudly.

**Warning signs:**
- Adding a new channel file and testing it, but notifications for that channel never arrive with no error in logs.
- The elif chain exceeds 6 branches.
- No test covering "unknown channel type triggers an error."

**Phase to address:** Webhook/SMS phase — refactor the registry before adding new channels, or at minimum at the start of that phase before any new elif blocks are added.

---

### Pitfall 3: Push Token is Device-Specific, Not User-Specific — Storing One Token Per Subscriber

**What goes wrong:**
Developers store a single `push_token` on the subscriber row (matching the existing pattern of `phone_number`, `slack_user_id`, etc. being scalar). A user installs the app on two devices — only the last registered device receives push notifications. When a user reinstalls the app, their token rotates — the old token becomes stale but stays in the DB, and all pushes to that subscriber silently fail.

**Why it happens:**
Every other channel identifier (email, phone, slack_user_id) is 1:1 with a subscriber. Push tokens are fundamentally different: one subscriber maps to N devices, each with its own token, and tokens are ephemeral (they rotate on reinstall, app update, OS transfer). The natural extension of the existing subscriber model is wrong for push.

**How to avoid:**
Model push tokens in a separate `device_tokens` table with a many-to-one relationship to subscribers:

```sql
CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES subscribers(id),
    team_id UUID NOT NULL REFERENCES teams(id),
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL,  -- 'fcm' | 'apns'
    device_id VARCHAR(255),         -- optional client-supplied identifier
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(team_id, token)
);
```

At push delivery time, query ALL active tokens for the subscriber and fan out to each one. On FCM `NotRegistered` or APNs `BadDeviceToken` error, mark that specific token `is_active = false` — do not delete (useful for analytics) and do not mark the subscriber as "undeliverable."

**Warning signs:**
- A `push_token` column being added directly to the `subscribers` table.
- Push delivery task looking up `subscriber.get("push_token")` instead of querying `device_tokens`.
- No token invalidation path when FCM/APNs return "NotRegistered" or "BadDeviceToken."

**Phase to address:** Push notification phase — schema design must use the separate table from day one; retrofitting is costly.

---

### Pitfall 4: Twilio A2P 10DLC Registration Is Not Instant — SMS Blocked Until Complete

**What goes wrong:**
SMS delivery fails silently (or is heavily filtered by carriers) because the Twilio account has not completed A2P 10DLC brand and campaign registration. A developer integrates Twilio, sends test messages successfully (short-code or trial mode), then deploys to production where long-code sending to real users fails or gets spam-filtered. In the US, unregistered long-code A2P traffic is blocked by all major carriers.

**Why it happens:**
Twilio trial accounts and short codes work without registration. Long-code A2P SMS in the US requires: (1) brand registration with The Campaign Registry (TCR), (2) campaign registration specifying use-case, opt-in flow, and sample messages, and (3) linking the phone number to the approved campaign. Registration takes 1–3 business days minimum; rejections add more days. Most failures happen at campaign registration (step 2 is where most rejections occur).

**How to avoid:**
- Begin A2P 10DLC brand + campaign registration before writing any SMS code.
- Use a Twilio Messaging Service (not a direct phone number) as the `from` identifier — this allows adding numbers later and enables geographic routing.
- Status callback URL must be registered at message-send time via `status_callback` parameter to track `queued → sent → delivered` vs `failed → undelivered`.
- For multi-tenant use (alrt sending SMS on behalf of multiple teams), either: (a) use alrt's own 10DLC registration for all alrt-hosted sends, or (b) require teams to bring their own Twilio credentials (BYOC). BYOC defers registration burden to teams but adds credential management complexity.
- SMS for the US: long codes need 10DLC. Toll-free numbers need toll-free verification. Short codes have separate registration.

**Warning signs:**
- Twilio error code `30034` (A2P registration required), `30003` (unreachable), or messages stuck in `queued` status.
- Test sends working but production sends failing or landing in spam.
- No Messaging Service SID in the Twilio integration — sending from raw phone number directly.

**Phase to address:** SMS implementation phase — registration must start at minimum 2 weeks before intended launch of SMS feature.

---

### Pitfall 5: Fallback Chain Produces Duplicate Deliveries on Retry

**What goes wrong:**
The routing engine sends via Channel A (e.g., push notification). Channel A's Celery task fails transiently (network timeout) and Celery auto-retries. Meanwhile, the routing engine's timeout fires and triggers Channel B (SMS fallback). When Channel A's retry succeeds, the subscriber receives the notification twice — once via push and once via SMS.

**Why it happens:**
Celery's built-in retry and the routing engine's fallback timeout operate independently with no shared state. The routing engine doesn't know that Channel A's task is still in-flight (retrying). The notification status in the DB is still `pending`, which the routing engine treats as "undelivered."

**How to avoid:**
Track delivery attempts at the notification level with a status machine, not a timeout:

1. At Channel A dispatch: write a `routing_attempt` record (or a field in `notifications`) with `status = 'in_flight'` and `channel = 'push'`.
2. Channel A worker: on success, set `status = 'delivered'`; on permanent failure (DLQ), set `status = 'failed'` and signal the routing engine to try the next channel.
3. The routing engine only triggers the fallback when the previous channel's notification row reaches `status = 'failed'` (or `status = 'dead_letter'`), not on a wall-clock timeout.
4. Add an idempotency check in each channel worker: if a delivered notification exists for this execution/channel combination, skip.

A simpler MVP approach: fallback is only triggered on explicit DLQ, never on timeout. Timeout-based fallback is a phase 2 complexity.

**Warning signs:**
- Subscriber reporting duplicate SMS + push for the same notification.
- Fallback logic polling notification status on a timer (`time.sleep(60)` pattern in routing code).
- No `routing_attempt` or per-channel delivery state tracked separately from the notification row.

**Phase to address:** Routing engine phase — design the state machine before building the fallback trigger logic.

---

### Pitfall 6: FCM HTTP v1 API — Not the Legacy API

**What goes wrong:**
Google deprecated and discontinued the legacy FCM HTTP API in June 2024. Code written against `https://fcm.googleapis.com/fcm/send` (legacy) will return 404. Documentation examples on older blog posts, Stack Overflow answers, and tutorials use the legacy endpoint. Developers copy these and build against a dead API.

**Why it happens:**
The FCM v1 API (`https://fcm.googleapis.com/v1/projects/{project_id}/messages:send`) uses OAuth 2.0 service account credentials (a JSON key file, not a simple server key string). This is fundamentally different from the legacy API's simple `Authorization: key=<server_key>` header. Developers familiar with the legacy API don't know the auth model changed.

**How to avoid:**
Use the FCM v1 API exclusively. The recommended Python approach:
- Use `google-auth` library to generate short-lived OAuth 2.0 access tokens from a service account JSON key file.
- Store the service account JSON as an encrypted secret (Fernet, same pattern as Slack bot_token).
- Access tokens expire after 1 hour — cache them and refresh proactively, don't regenerate per-request.

```python
from google.oauth2 import service_account
import google.auth.transport.requests

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

def get_fcm_access_token(service_account_info: dict) -> str:
    credentials = service_account.Credentials.from_service_account_info(
        service_account_info, scopes=SCOPES
    )
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    return credentials.token  # Cache this; valid ~1 hour
```

**Warning signs:**
- Any code using `Authorization: key=<server_key>` for FCM.
- `firebase_admin` SDK being used for push in workers (heavy dependency; raw HTTP v1 is simpler for backend-only use).
- `https://fcm.googleapis.com/fcm/send` URL in any worker task.

**Phase to address:** Push notification phase — validate API endpoint and auth model before writing any push delivery code.

---

### Pitfall 7: Subscriber Model Cannot Hold Push Token as a Scalar Field

**What goes wrong:**
Following the existing pattern (where each channel gets a column on `subscribers` — `phone_number`, `discord_webhook_url`, `telegram_chat_id`), a developer adds a `fcm_token` column to `subscribers`. The UPSERT query overwrites the token on every update. When a subscriber uses multiple devices, only the most recently updated device's token is stored. All other devices never receive push notifications.

**Why it happens:**
The pattern of scalar channel identifiers on subscribers is consistent and has worked for all previous channels because those identifiers (email address, phone number, Telegram chat ID) are genuinely singular per subscriber. Push tokens break this model because they are inherently plural and ephemeral.

**How to avoid:**
See Pitfall 3. The `device_tokens` table is mandatory. There is no safe way to simplify this to a single column on `subscribers`.

Additionally, the token registration endpoint must be separate from subscriber update — clients should `POST /subscribers/:id/tokens` to register a device token, not include it in `PATCH /subscribers/:id`.

**Warning signs:**
- Any `ALTER TABLE subscribers ADD COLUMN fcm_token` or `apns_token` migration.
- `UPSERT_BY_EXTERNAL_ID` query including a `fcm_token` field.
- A single push delivery task that reads `subscriber["fcm_token"]` instead of querying a tokens table.

**Phase to address:** Push notification phase — schema design review before any schema migration is written.

---

### Pitfall 8: Webhook Delivery Without HMAC Signature — Clients Cannot Verify Authenticity

**What goes wrong:**
Alrt delivers a notification to a customer's webhook endpoint. The customer's endpoint has no way to verify the request came from alrt and not from a third party who discovered the URL. Any POST to that endpoint from a malicious actor would be processed as a legitimate notification.

**Why it happens:**
Developers focus on making the POST work and defer the signing mechanism as a "nice to have." Webhook URL secrecy (keeping the URL private) is treated as the only security control, but URLs leak through logs, error messages, and network captures.

**How to avoid:**
Sign every outbound webhook POST with an HMAC-SHA256 signature using a per-team shared secret. Include the signature in a header (`X-Alrt-Signature-256: sha256=<hex_digest>`). The signing secret is generated at webhook registration time and exposed once to the team (like an API key). Teams verify the signature in their handler before processing.

```python
import hmac, hashlib

def _sign_webhook_body(body: bytes, secret: str) -> str:
    return "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
```

Store the signing secret encrypted in the `providers` or `webhooks` table using Fernet (same pattern as Slack bot_token).

**Warning signs:**
- Webhook delivery task sending POST without any signature header.
- No `webhook_signing_secret` field in the webhook configuration schema.
- Documentation describing webhook verification as optional.

**Phase to address:** Webhook implementation phase — signing must be in the initial implementation, not added later (retroactively rotating secrets for all registered webhooks is painful).

---

### Pitfall 9: Routing Engine Respects Preferences but Not Subscriber Field Availability

**What goes wrong:**
The routing engine selects `push` as the preferred channel for a subscriber based on their preferences. The subscriber has no registered device tokens (never opened the mobile app). The push worker task runs, queries `device_tokens`, finds nothing, logs a warning, and returns. The routing engine has no fallback because preferences indicated push was wanted. Notification is silently dropped.

**Why it happens:**
Preferences express desired channels. Subscriber field availability (whether the required credential exists) is a separate concern. The routing engine checks preferences but not delivery feasibility before selecting a channel. This is analogous to the existing behavior where WhatsApp delivery silently skips when `phone_number` is null — but for the routing engine, that silent skip must trigger the next channel in the fallback chain.

**How to avoid:**
Before enqueuing a channel task, the routing engine must evaluate both conditions:
1. Channel is enabled in subscriber preferences (existing check).
2. Subscriber has the required credential for that channel (new check).

Build a `_can_deliver(subscriber, channel)` function that returns `True` only when both conditions are met:

```python
CHANNEL_CREDENTIAL_FIELDS = {
    "in_app":    lambda s: True,  # Always available
    "email":     lambda s: bool(s.get("email")),
    "slack":     lambda s: bool(s.get("slack_user_id")),
    "whatsapp":  lambda s: bool(s.get("phone_number")),
    "discord":   lambda s: bool(s.get("discord_webhook_url")),
    "telegram":  lambda s: bool(s.get("telegram_chat_id")),
    "sms":       lambda s: bool(s.get("phone_number")),
    "webhook":   lambda s: bool(s.get("webhook_url")),  # from providers table
    "push":      lambda s: s.get("_has_push_tokens", False),  # queried separately
}
```

**Warning signs:**
- Routing engine only checking `preferences.get("global", {}).get(channel, True)` without checking subscriber credentials.
- Notifications for routing-selected channels consistently landing in DLQ for "no credential" reason with no fallback attempt.
- `_can_deliver` logic missing from routing engine design.

**Phase to address:** Routing engine phase — this is core to the routing engine's correctness, not an edge case.

---

### Pitfall 10: Celery Chain Queue Routing — Only First Task Gets the Right Queue

**What goes wrong:**
The routing engine implements a fallback chain using Celery's `chain()` primitive (e.g., try push, then SMS). Applying a queue name to the chain only routes the first task to the named queue. Subsequent tasks in the chain use Celery's default queue. The SMS fallback task ends up in the default queue, processed by any available worker, bypassing the dedicated `sms` queue and its concurrency controls.

**Why it happens:**
Celery's `chain()` documentation doesn't prominently state this behavior. The `.set(queue='name')` must be applied to each task in the chain individually. Developers assume that setting a queue on a chain applies to all tasks in it.

**How to avoid:**
Do not use Celery `chain()` for routing fallback. Instead, implement fallback as a callback in the worker itself: the push worker, on permanent failure, explicitly enqueues the SMS task to the `sms` queue. This keeps queue routing explicit:

```python
# In push.deliver — on permanent failure:
from alrt_workers.tasks.channels.sms import deliver as sms_deliver
sms_deliver.apply_async(
    args=[execution_id, subscriber_id, team_id, template_data, payload],
    queue="sms"
)
```

If chain() is used for other purposes, always set `queue` on every `.si()` call explicitly.

**Warning signs:**
- Celery chain() being used for multi-channel fallback logic.
- SMS or webhook tasks appearing in the `default` queue when they should be in `sms` or `webhook`.
- Queue isolation from SCALE-01 (already implemented) being bypassed for fallback tasks.

**Phase to address:** Routing engine phase — explicit queue routing must be part of the fallback design.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing FCM/APNs token as scalar field on subscribers | Consistent with existing channel model, simple schema | Cannot support multi-device, token rotation causes silent failures, requires schema migration | Never — do the `device_tokens` table from the start |
| elif chain dispatch for channels | Familiar pattern, already exists | Silent failures when channel not in chain, every new channel requires core file edit, no registry discoverability | Only if channel count stays under 6 and the `else` branch logs an error loudly |
| Timeout-based routing fallback (wall-clock) | Simpler to implement than state-machine fallback | Duplicate deliveries when primary channel retries and succeeds after timeout | Never for production; acceptable in prototype/demo only |
| Skip A2P 10DLC registration, use trial Twilio number | Faster to test | SMS blocked in production for all US numbers; cannot be retroactively fixed | Never for production SMS; acceptable for dev testing only |
| No HMAC signing on outbound webhooks | Simpler webhook delivery task | Customers cannot verify payload authenticity; phishing/spoofing risk | Never — omitting signing is a security regression |
| Webhook URL validated at registration only | Simpler delivery worker | SSRF via DNS rebinding — validation at rest doesn't prevent attack at delivery time | Never — validate at both registration and delivery |
| Per-request FCM access token generation | Simple, no caching complexity | OAuth token exchange adds 200-500ms latency per push; rate limits on token endpoint | Never — cache tokens for their ~1h lifetime |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Twilio SMS | Using phone number directly as `from`; no Messaging Service | Always use a Messaging Service SID for `from` — enables number pooling, locality, 10DLC campaign attachment, and delivery receipts |
| Twilio SMS | Treating `queued` status as success | `queued` means Twilio accepted it, not that the carrier delivered it. Register `status_callback` URL and track `delivered` vs `undelivered` per message SID |
| FCM v1 | Using legacy `Authorization: key=` header | Use `google-auth` service account OAuth 2.0 token with `Authorization: Bearer <access_token>` |
| FCM v1 | Generating an OAuth token per push request | Cache OAuth tokens for their 1-hour lifetime; use a Redis key with expiry to share cached token across workers |
| APNs | Opening a new HTTP/2 connection per notification | APNs best practice is connection reuse; opening/closing per message is treated as DoS by Apple; use `httpx.Client()` with connection pooling or `httpx.AsyncClient()` |
| APNs | Using certificate-based auth (.pem files) | Apple deprecated cert-based auth; use token-based auth (.p8 key file + JWT with 1-hour expiry); JWT clock drift causes auth failures if server clock is not NTP-synced |
| Outbound webhooks | Storing webhook URL in `subscribers` table | Webhook URLs are team-level configuration, not subscriber-level. Store in `providers` or a dedicated `webhooks` table. Subscribers reference a webhook configuration, they don't own it |
| Outbound webhooks | No retry on 5xx from target endpoint | Target server may be temporarily unavailable. Retry with exponential backoff on 5xx; do NOT retry on 4xx (permanent configuration error) |
| Twilio A2P 10DLC | Sending without campaign registration | Carriers silently filter or block; error shows as `undelivered` with no useful error code; fix requires registration which takes days |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fan-out push delivery for bulk triggers (1000 subscribers × N devices each) | Bulk trigger for 1000 subscribers with 3 devices each creates 3000 FCM calls; push queue saturates; delivery backlog grows | Implement per-subscriber device token fan-out inside the push worker, not the routing engine. Push worker queries all tokens for subscriber and sends concurrently in the task, not as separate Celery tasks per token | At ~300 subscribers with 3+ devices each; earlier if push queue workers are limited |
| Synchronous FCM OAuth token refresh in every worker | Push notifications slow (300-500ms extra latency per notification) | Cache FCM access token in Redis with `SETEX` at TTL = token expiry - 5 minutes; all workers read from cache | From the first push notification if no caching is implemented |
| Single Redis connection per frequency cap check | Redis connection leak in `step_runner.py` — `redis.Redis.from_url()` opens a new connection per check, never pooled | Use a module-level Redis connection pool; `step_runner.py` already has this anti-pattern for frequency caps (Pitfall exists in current code) | At ~100 concurrent workflow executions; Redis connection limit hit |
| JSONB payload query for push token lookup | `WHERE payload->>'push_token' = $1` — sequential scan on large notifications table | Push tokens live in `device_tokens` table with proper index on `token` and `subscriber_id` — never in `notifications.payload` | At ~10,000 notifications; earlier without index |
| Routing engine evaluating all channels for every execution | N channel checks per execution even when only 1 channel is relevant | Short-circuit evaluation: stop at first feasible channel (if no fallback needed) or evaluate only preferred channels list | At >500 workflow executions/minute with complex routing rules |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing FCM service account JSON unencrypted in providers table | Service account has write access to FCM; compromise allows sending push to any device registered with that project | Encrypt with Fernet (same pattern as Slack `bot_token`); store as `config: {"encrypted": "..."}` |
| Outbound webhook to user-provided URL without SSRF protection | Internal network access, cloud metadata exfiltration, SSRF | Validate resolved IP against blocked ranges at delivery time, not just at URL registration time |
| No per-team webhook signing secret | Customers cannot distinguish alrt-originated requests from spoofed ones | Generate a unique HMAC secret per webhook registration, expose once, sign all outbound requests |
| Logging full webhook request body | Webhook bodies may contain PII or sensitive business data | Log only webhook URL, response status code, and notification ID in workers; never log body |
| Twilio Account SID + Auth Token stored plaintext | Credential compromise allows sending SMS from team's Twilio account at team's expense | Encrypt with Fernet; treat same as Slack bot_token; never log or expose in API responses |
| APNs private key (.p8 file) stored as plaintext string | Private key can be used to send push to any device registered with that APNs team | Encrypt with Fernet; validate key format on storage; consider KMS for production |
| No timeout on outbound webhook HTTP calls | Slow target server ties up Celery worker indefinitely | Always set `timeout=10` on httpx calls; Celery workers have finite concurrency — a hanging task blocks others |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Push token registration exposed as a subscriber field update | Developers must update the entire subscriber to register a new device | Expose a dedicated `POST /subscribers/:id/tokens` endpoint; token management is separate from subscriber profile |
| Routing "preferred channel" UI with no indicator of whether subscriber has that channel configured | Developer sets push as preferred, but subscriber has no device tokens; notification silently drops | Dashboard subscriber detail view should show per-channel availability (phone_number present, device_tokens present, etc.) alongside preferences |
| Webhook registration UI without test-fire button | Developer cannot verify their endpoint handles alrt payloads correctly before going live | Include a "Send test event" button in the webhook configuration UI that fires a sample payload immediately |
| No delivery status tracking for outbound webhooks | Developer cannot tell if their webhook endpoint is receiving events or 5xx-ing | Track HTTP response code and response body snippet in the notification row for webhook channel, same as other channels |
| SMS "delivered" status misleading | `sent` status in alrt dashboard while carrier reports `undelivered` | Only mark SMS notification as `sent` when Twilio status callback reports `delivered`; mark `failed` on `undelivered` or `failed` |

---

## "Looks Done But Isn't" Checklist

- [ ] **SMS delivery:** Twilio integration sends from a Messaging Service (not raw phone number) — verify `MessagingServiceSid` is used, not `From` phone number directly.
- [ ] **SMS status:** Status callback URL registered at send time — verify Twilio `status_callback` parameter is set and the callback endpoint is implemented.
- [ ] **A2P 10DLC:** Brand and campaign registration approved before production launch — verify in Twilio Console that campaign status is `VERIFIED` and phone number is attached to campaign.
- [ ] **FCM API version:** FCM v1 API endpoint used — verify no `https://fcm.googleapis.com/fcm/send` URLs anywhere in worker code.
- [ ] **Push tokens table:** `device_tokens` table exists with `UNIQUE(team_id, token)` constraint — verify schema, not a column on `subscribers`.
- [ ] **Dead token cleanup:** FCM `NotRegistered` / APNs `BadDeviceToken` responses trigger `is_active = false` on the token row — verify error handling path in push worker.
- [ ] **Webhook SSRF:** IP validation runs at delivery time in the worker, not just at URL registration — verify the worker resolves and validates the IP before connecting.
- [ ] **Webhook signing:** Every outbound webhook POST includes `X-Alrt-Signature-256` header — verify by checking outbound request in test logs.
- [ ] **Routing fallback idempotency:** Fallback to secondary channel only fires when primary channel notification reaches `dead_letter` status — verify no duplicate delivery in integration test with a simulated primary channel failure.
- [ ] **elif chain / registry:** No silent fallthrough for unknown channel types — verify with a test using a channel name not in the registry.
- [ ] **FCM OAuth caching:** FCM access token cached in Redis, not regenerated per task — verify Redis key `fcm:access_token` is populated after first push.
- [ ] **Routing preference + feasibility:** Routing engine skips channels where subscriber lacks required credential — verify a subscriber with no push tokens does not get push selected as primary channel.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSRF via webhook URL | HIGH | Immediately disable outbound webhook delivery; audit access logs for requests to internal IPs; rotate any secrets that may have been exposed; add IP validation to delivery worker before re-enabling |
| FCM legacy API was used | LOW | Update endpoint URL and auth header to v1 API; the legacy API is fully dead so no partial migration needed |
| Push tokens stored on subscriber table | HIGH | Schema migration to extract tokens to `device_tokens` table; all clients must re-register tokens since old tokens cannot be matched to devices; requires coordinated deploy with mobile client update |
| Twilio A2P not registered, production SMS blocked | MEDIUM | Start brand + campaign registration immediately (takes 1-3 days); use toll-free number as temporary fallback (requires separate verification); no instant fix exists |
| Duplicate delivery from fallback race condition | MEDIUM | Add idempotency check in channel workers; deduplicate by `(workflow_execution_id, channel)` before send; mark duplicates in notifications table |
| No webhook HMAC signing — retroactive rollout | MEDIUM | Generate signing secrets for all existing webhooks; expose new secrets to teams via dashboard; document verification pattern; existing webhooks continue to work (teams can opt into verification) |
| elif chain silent drop | LOW | Add registry + loud logging; replay missed notifications from DLQ or by re-triggering the event |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SSRF via webhook URL | Webhook channel phase — delivery worker | Test: send webhook to `http://127.0.0.1/test` — must be rejected at delivery, not just registration |
| elif chain breaks at 8+ channels | Before adding any new channel (webhook/SMS phase start) | Test: dispatch to unknown channel type `"bogus"` — must log error, not silently return `"ok"` |
| Push token as scalar on subscriber | Push notification phase — schema design | Review: no `fcm_token` or `apns_token` column on `subscribers` table |
| Twilio A2P 10DLC registration | SMS implementation phase — pre-implementation | Check: Twilio Console campaign status is `VERIFIED` before any production SMS send |
| Routing engine duplicate delivery | Routing engine phase — fallback state machine design | Test: simulate push worker DLQ; verify SMS fallback fires exactly once |
| FCM legacy API | Push notification phase — first line of worker code | Grep: no `fcm/send` URL anywhere in codebase |
| Push token multi-device model | Push notification phase — schema design | Schema review: `device_tokens` table with subscriber FK and `UNIQUE(team_id, token)` |
| Webhook delivery without HMAC signing | Webhook channel phase — delivery worker | Test: outbound webhook has `X-Alrt-Signature-256` header; verify HMAC with registered secret |
| Routing ignores subscriber field availability | Routing engine phase — channel selection logic | Test: subscriber with no push tokens, push preferred — must fall through to next feasible channel |
| Celery chain queue routing bypass | Routing engine phase — fallback implementation | Test: monitor Celery queues during fallback; verify SMS task appears in `sms` queue, not `default` |
| FCM OAuth token per-request | Push notification phase — token caching | Benchmark: push notification latency with and without caching; verify Redis key `fcm:access_token` is reused |
| Routing preference without feasibility check | Routing engine phase — `_can_deliver` implementation | Test: subscriber with push preferred but no tokens; verify no delivery and correct fallback behavior |

---

## Sources

- [Twilio A2P 10DLC Registration Guide (2025)](https://www.notificationapi.com/blog/a2p-10dlc-registration-the-complete-developer-s-guide-2025) — MEDIUM confidence
- [Twilio Rate Limits and Message Queues](https://help.twilio.com/articles/115002943027-Understanding-Twilio-Rate-Limits-and-Message-Queues) — HIGH confidence (official Twilio docs)
- [FCM Registration Token Management Best Practices](https://firebase.google.com/docs/cloud-messaging/manage-tokens) — HIGH confidence (official Firebase docs)
- [FCM HTTP v1 API Migration Guide](https://firebase.google.com/docs/cloud-messaging/migrate-v1) — HIGH confidence (official Firebase docs)
- [Firebase Push Tokens Are Device-Specific, Not User-Specific](https://dev.to/sangwoo_rhie/firebase-push-tokens-are-device-specific-not-user-specific-a-critical-refactoring-ppi) — MEDIUM confidence
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) — HIGH confidence (official OWASP)
- [Convoy: Webhook SSRF Prevention](https://docs.getconvoy.io/webhook-guides/tackling-ssrf) — MEDIUM confidence
- [Svix Webhook Security Best Practices](https://www.svix.com/resources/webhook-best-practices/security/) — MEDIUM confidence
- [Why Mobile Push Notification Architecture Fails — Netguru](https://www.netguru.com/blog/why-mobile-push-notification-architecture-fails) — MEDIUM confidence
- [Celery Task Routing Documentation](https://docs.celeryq.dev/en/stable/userguide/routing.html) — HIGH confidence (official Celery docs)
- [Celery Chain Queue Routing Pitfall](https://fastapitutorial.com/blog/routing-celery-tasks-fastapi/) — MEDIUM confidence
- [Push Notification Fallback Architecture — Courier](https://www.courier.com/blog/push-notification-fallbacks-ensuring-message-delivery-with-email-slack-sms) — MEDIUM confidence
- [APNs JWT Auth Errors Troubleshooting](https://www.magicbell.com/blog/auth-error-from-apns-or-web-push-service-troubleshoot-guide) — MEDIUM confidence
- Alrt codebase analysis: `step_runner.py`, `channels/slack.py`, `channels/email.py`, `channels/whatsapp.py`, `channels/telegram.py`, `schema.sql`, `queries/subscribers.py` — HIGH confidence (direct codebase observation)

---
*Pitfalls research for: Multi-channel notification platform — v1.1 channel expansion (webhooks, SMS, routing engine, push)*
*Researched: 2026-03-06*
