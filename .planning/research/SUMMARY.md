# Project Research Summary

**Project:** Alrt v1.1 — Channel Expansion + Smart Routing
**Domain:** Multi-channel notification infrastructure (webhooks, SMS, push, smart routing)
**Researched:** 2026-03-06
**Confidence:** HIGH

## Executive Summary

Alrt v1.1 expands an already-working 6-channel notification system (in-app, email, Slack, WhatsApp, Discord, Telegram) with four new capabilities: generic outbound webhooks, SMS via Twilio, push notifications via FCM/APNs, and a smart routing engine. The research is grounded in the existing codebase, which provides high-confidence integration points — each new channel follows a proven pattern: a new `channels/*.py` Celery task, an `elif` branch in `step_runner._handle_channel()`, a queue entry in `celery_app.py`, and a DLQ entry in `notifications.py`. The core architecture does not change; new channels are additive.

The recommended build order is: webhooks first (validates the extension pattern, no new deps), then SMS (phone_number already on subscriber), then push (requires new `device_tokens` table and firebase-admin SDK), then the routing engine last (most valuable when multiple channels exist to route between). Two new library additions are required: `twilio>=9.10` and `firebase-admin>=6.5`, both workers-only. Everything else — httpx, Jinja2, Fernet encryption, DLQ retry — is already installed and reusable.

The three highest-risk areas are: (1) SSRF via user-supplied webhook URLs — must validate resolved IP at delivery time, not just at registration; (2) push tokens being modeled as a scalar field on subscribers — a separate `device_tokens` table is mandatory from day one; and (3) Twilio A2P 10DLC registration — this is an ops task that takes 1-3 business days and must begin before any SMS code is written. Fallback chains in the routing engine carry a duplicate-delivery risk that must be addressed with a status-machine approach rather than wall-clock timeouts.

## Key Findings

### Recommended Stack

The existing stack is fully locked. All new capabilities require only two new dependencies, both scoped to workers:

- `twilio>=9.10` (workers only): Official Twilio Python SDK for SMS delivery. Handles HTTP Basic Auth encoding, phone number normalization, and `RequestValidator` for Twilio status callbacks. Sync client is correct in Celery context — do not use `create_async()`.
- `firebase-admin>=6.5` (workers only): Google's official Admin SDK for FCM push delivery. Manages OAuth2 service account token refresh transparently. Use `messaging.send_each_for_multicast()` — `send_multicast()` was deprecated and removed June 2024.

Generic outbound webhooks and smart routing require no new libraries. Webhooks use existing `httpx` + stdlib `hmac`/`hashlib`. The routing engine is 50-100 lines of pure Python.

**Core technologies (new additions only):**
- `twilio>=9.10`: SMS delivery — only official SDK handling Twilio auth + request validation
- `firebase-admin>=6.5`: FCM push delivery — handles OAuth2 token management, FCM HTTP v1 API
- `httpx` (existing): Outbound webhook delivery + Twilio direct HTTP as fallback
- `jinja2` (existing): Webhook body template rendering — same `render()` function as all other channels
- `cryptography/Fernet` (existing): Encrypt Twilio credentials, FCM service account JSON, webhook signing secrets

**New schema additions:**
- `push_tokens` table: Required for multi-device push token storage. Cannot use a scalar column on `subscribers`.
- `notifications.channel` VARCHAR(20): Accepts `'webhook'`, `'sms'`, `'push'` — no migration needed.
- `providers` table: New channel types `'sms'`, `'push'`, `'webhook'` — no schema change, just new data rows.

### Expected Features

**Must have (table stakes):**
- Webhook channel node with HTTP POST delivery, configurable headers, HMAC-SHA256 signing (X-Alrt-Signature-256)
- Webhook exponential backoff retry (5 attempts, 30s initial, max 3600s) using existing DLQ infrastructure
- Webhook delivery log (HTTP status code, response body snippet, latency) per attempt
- SMS channel node via Twilio shared account — phone_number already on subscriber
- SMS STOP/UNSUBSCRIBE opt-out sync to subscriber preferences (legal requirement — TCPA)
- SMS delivery status tracking via Twilio status callbacks
- Push channel node with FCM delivery (Android + iOS via FCM→APNs bridge)
- Device token registration API (`POST /subscribers/:id/push-tokens`)
- Multiple devices per subscriber (the `device_tokens` table is the only correct model)
- Auto-prune invalid/stale tokens on FCM `UNREGISTERED` error
- Routing engine: enforce DND windows, frequency caps, and per-channel subscriber opt-outs before delivery
- Routing engine: skip channels where subscriber lacks required credential (no phone → skip SMS)

**Should have (differentiators):**
- Priority-ordered fallback chains: try channel A, fall back to B after A fails (timeout-based poller using existing Beat infrastructure)
- Router node type in workflow builder (explicit in graph, supports fallback and fan-out strategies)
- `preferred_channel` field on subscribers for explicit user preference
- Webhook test-fire button in dashboard ("Send test event")
- Per-attempt response body in delivery log for webhook channel
- Endpoint health monitoring (auto-disable after N consecutive failures)
- BYOC Twilio credentials (team provides own Account SID + Auth Token) — white-label tier
- Template support for SMS and webhook body (reuses existing template system)

**Defer (v2+):**
- BYOC FCM project (team's own Firebase project)
- APNs direct integration bypassing FCM (FCM bridge covers 95% of iOS use cases)
- Web push / VAPID (separate protocol, different key management)
- MMS, two-way SMS, number provisioning UI
- AI/ML-driven channel selection
- Webhook fan-out to multiple URLs per trigger
- SMS cost estimate in dashboard (requires Twilio pricing API)
- Notification click tracking for push (requires in-app SDK instrumentation)

### Architecture Approach

All four new features integrate into the existing three-tier architecture (FastAPI API → Celery workers → PostgreSQL/Redis) without structural changes. Each new channel adds: one `channels/*.py` task file (following the existing Discord/email pattern), one queue entry in `celery_app.task_routes`, one `elif` branch in `step_runner._handle_channel()`, and two dict entries in `notifications.py` (task_map + queue_map). The routing engine is a new `tasks/routing_engine.py` module invoked via a new `elif node_type == "router"` branch in `step_runner`. The `push_tokens` table is the only new schema addition; webhook config lives in workflow node JSONB.

**Major components:**
1. `channels/webhook.py` — Deliver task: render body template, HMAC-sign, POST via httpx, SSRF-validate URL, retry on 5xx/timeout, dead-letter on 4xx
2. `channels/sms.py` — Deliver task: load Twilio credentials (alrt-hosted env vars or BYOC Fernet-decrypted), render template, POST to Twilio Messages API, handle status callback
3. `channels/push.py` — Deliver task: query all active `push_tokens` for subscriber, partition by platform, FCM multicast via firebase-admin, mark invalid tokens inactive
4. `tasks/routing_engine.py` — `execute_routing()`: check subscriber credential availability + preferences per channel, attempt in priority order, poll notification status for fallback (5s intervals up to timeout)
5. `push_tokens` table — Separate device token storage with `UNIQUE(team_id, token)`, `is_active` flag, `last_used_at` for staleness detection
6. `POST /webhooks/twilio/sms` — Inbound status callback: look up notification by Twilio MessageSid, update status, sync STOP opt-outs to preferences
7. `POST /subscribers/:id/push-tokens` — Token registration endpoint (separate from subscriber PATCH)

### Critical Pitfalls

1. **SSRF via user-supplied webhook URLs** — Validate the resolved IP against RFC-1918 + cloud metadata ranges at delivery time in the Celery worker (not just at API registration). Use `socket.getaddrinfo()` + `ipaddress` checks before connecting. DNS rebinding makes registration-time validation insufficient.

2. **Push tokens as scalar subscriber fields** — Never add `fcm_token` to the `subscribers` table. Push tokens are per-device, ephemeral, and multiple per user. The `device_tokens` (or `push_tokens`) table with a subscriber FK is mandatory from day one. Retrofitting costs a schema migration + full client token re-registration.

3. **Twilio A2P 10DLC registration is not instant** — Brand + campaign registration with The Campaign Registry takes 1-3 business days. US long-code SMS is carrier-blocked without it. Start registration before writing SMS code; use a Twilio Messaging Service SID (not a raw phone number) as the `from` sender.

4. **Fallback chain duplicate delivery** — Celery's built-in retry and the routing engine's fallback timeout operate independently. If channel A retries successfully after the fallback timeout fires channel B, the subscriber receives two notifications. Use status-machine fallback: only trigger channel B when channel A's notification row reaches `dead_letter` status — never on wall-clock timeout alone.

5. **elif chain silent fallthrough** — With 9+ channels, the `elif` dispatch in `step_runner._handle_channel()` must be replaced with a dictionary registry before adding new channels. Unknown channel types currently return `"ok"` silently with no delivery and no log entry. Refactor to a `CHANNEL_REGISTRY` dict with a loud `log.error()` on missing channel as the first task in the webhook/SMS phase.

6. **FCM legacy API** — The legacy `https://fcm.googleapis.com/fcm/send` endpoint was discontinued June 2024. Use firebase-admin SDK (v6.5+) which targets FCM HTTP v1. Cache the OAuth2 access token in Redis (1-hour TTL) — do not regenerate per task.

## Implications for Roadmap

Based on research, the natural build order follows technical dependencies and risk sequencing.

### Phase 1: Generic Outbound Webhooks
**Rationale:** Webhooks are the lowest-risk new channel (no external SDK, no new compliance requirements) and establish the extension pattern for all subsequent channels. SSRF protection and HMAC signing must be built into the initial implementation — retroactive signing rollout is painful. Refactor `step_runner` dispatch to a registry pattern here before the elif chain grows further.
**Delivers:** Webhook channel node in workflow builder, HMAC-signed outbound POST delivery, exponential retry via existing DLQ, delivery log with response body, SSRF IP validation, test-fire button in dashboard.
**Addresses:** Webhook table stakes from FEATURES.md; validates universal channel primitive architecture
**Avoids:** SSRF pitfall (Pitfall 1), elif chain silent fallthrough (Pitfall 2), webhook-without-HMAC pitfall (Pitfall 8)
**Research flag:** Standard patterns — webhook delivery, HMAC signing, and DLQ retry are well-documented. No research phase needed.

### Phase 2: SMS via Twilio
**Rationale:** SMS follows the same worker pattern as webhooks. The `phone_number` field already exists on subscribers (added for WhatsApp). The blocking constraint is A2P 10DLC registration — this ops task must start before Phase 2 begins. Twilio credentials follow the existing BYOC Fernet pattern.
**Delivers:** SMS channel node, Twilio delivery via shared account, E.164 validation, Twilio status callback endpoint, STOP opt-out sync to preferences, delivery status tracking.
**Uses:** `twilio>=9.10` (new worker dep), existing Fernet encryption, existing DLQ retry
**Avoids:** A2P 10DLC blocking (Pitfall 4) — register before coding; Twilio `queued` ≠ `delivered` confusion
**Research flag:** Standard patterns — Twilio SMS integration is well-documented. No research phase needed. Pre-work: start A2P registration immediately.

### Phase 3: Push Notifications (FCM/APNs)
**Rationale:** Push is the most architecturally complex new channel due to multi-device token semantics. The `device_tokens` table schema must be correct from day one — there is no safe shortcut to storing a scalar token on subscribers. Firebase-admin SDK handles FCM HTTP v1 and OAuth2 token management. APNs is covered via FCM bridge for Phase 1 (direct APNs deferred).
**Delivers:** Push channel node, `device_tokens` table, token registration/deletion API, FCM multicast delivery, token invalidation on UNREGISTERED error, Redis-cached FCM OAuth token.
**Uses:** `firebase-admin>=6.5` (new worker dep), new `push_tokens` table, `POST /subscribers/:id/push-tokens` endpoint
**Avoids:** Scalar push token pitfall (Pitfalls 3 + 7), FCM legacy API pitfall (Pitfall 6), per-request OAuth token generation (performance trap)
**Research flag:** FCM token management and multi-device model are well-documented. No research phase needed. Note: APNs direct integration (without FCM bridge) would need research if required.

### Phase 4: Smart Routing Engine
**Rationale:** The routing engine is most valuable when multiple channels exist to route between — building it last means it can route across all previously built channels. It is also the most architecturally invasive change (modifies `step_runner` execution contract). The polling-based fallback (5s intervals, check notification status) fits existing architecture without Celery chord complexity.
**Delivers:** `routing_engine.py` module, router node type in workflow builder (priority list, fallback/fan-out strategy, timeout config), DND + frequency cap enforcement in step_runner, `_can_deliver()` feasibility check per channel, router result visualization in activity feed.
**Implements:** Router node architecture (Option A — explicit node in graph), polling-based fallback, `_can_deliver()` credential + preference check, `preferred_channel` field on subscribers
**Avoids:** Duplicate delivery from fallback race (Pitfall 5), routing ignoring subscriber credential availability (Pitfall 9), Celery chain queue routing bypass (Pitfall 10)
**Research flag:** Fallback chain timeout values and state machine design have no single authoritative source. A focused research pass on production routing implementations (Courier, Knock, SuprSend patterns) is recommended before implementing the fallback state machine.

### Phase Ordering Rationale

- Webhooks first: validates the channel extension pattern with zero external API risk; SSRF + HMAC must be first-class, not retrofitted
- SMS second: phone_number is already available; only blocker is A2P ops (start immediately); follows webhook pattern exactly
- Push third: requires new table (additive, low-risk migration) and new SDK; token lifecycle complexity isolated to one phase
- Routing last: requires all channels to be stable to be useful; fallback chains are meaningless with only one channel; polling fallback fits existing Beat/scheduled_steps pattern

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Smart Routing — fallback state machine):** Fallback timeout values, idempotency patterns for duplicate delivery prevention, and whether polling vs Celery chord is the right choice at target scale. Look at Courier, Knock, SuprSend implementation docs.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Webhooks):** HMAC signing, SSRF protection, and exponential retry are well-documented. Existing Discord/email channel pattern is sufficient reference.
- **Phase 2 (SMS):** Twilio Python SDK, 10DLC requirements, and status callback patterns are fully documented in official Twilio docs.
- **Phase 3 (Push):** firebase-admin SDK, FCM HTTP v1 API, and token lifecycle management are documented in official Google Firebase docs. Token table schema is unambiguous.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Twilio SDK and firebase-admin verified via PyPI + official docs. No conflicts with existing stack. FCM legacy API deprecation confirmed via official GitHub discussion. |
| Features | HIGH | Webhook and SMS table stakes verified against Svix, standard-webhooks spec, Twilio docs, TCPA/FCC regulatory sources. Push token lifecycle from official Firebase docs. |
| Architecture | HIGH | Grounded in existing codebase (step_runner, celery_app, channels/discord.py patterns). Integration points are mechanical additions, not design decisions. |
| Pitfalls | HIGH | SSRF from OWASP, push token multi-device model from Firebase official docs, 10DLC from Twilio official, FCM v1 migration from Google official. Routing duplicate delivery from production incident reports (MEDIUM — Courier blog). |

**Overall confidence:** HIGH

### Gaps to Address

- **Fallback timeout values:** Research found no authoritative recommendation for how long to wait before triggering a fallback channel. Courier and Knock both describe the pattern but not specific timeout values. Recommendation: start with 30s (configurable per router node); adjust based on real delivery latency data.
- **BYOC Twilio for multi-tenant SMS:** Whether to use alrt's shared 10DLC registration or require BYOC credentials for production SMS is an ops/business decision, not a technical one. Deferred to white-label phase but affects 10DLC registration scope.
- **APNs direct integration:** If any customer requires direct APNs (bypassing FCM bridge), a separate research pass is needed for HTTP/2 connection pooling and .p8 key management in Celery workers.
- **Redis connection pooling in step_runner:** PITFALLS.md identified an existing anti-pattern (new Redis connection per frequency cap check in step_runner). Fix this during Phase 4 (routing engine) when step_runner is already being modified.

## Sources

### Primary (HIGH confidence)
- Official Twilio Python SDK docs + GitHub — Twilio SMS integration, RequestValidator, status callbacks
- Firebase Admin Python SDK official docs — FCM HTTP v1 API, `send_each_for_multicast()`, token management
- Firebase FCM migration guide (official Google) — confirmed legacy API discontinued June 2024
- OWASP SSRF Prevention Cheat Sheet — IP validation pattern for webhook SSRF
- Standard Webhooks specification — HMAC-SHA256 signing standard
- Alrt codebase (ground truth): `step_runner.py`, `channels/discord.py`, `channels/email.py`, `celery_app.py`, `schema.sql`

### Secondary (MEDIUM confidence)
- Courier blog: Push notification fallbacks — fallback chain patterns in production
- Svix webhook security best practices — outbound webhook HMAC signing patterns
- System Design Handbook: Notification System — routing + fallback architecture reference
- Knock: Top Notification Platforms 2026 — competitive feature landscape
- Twilio A2P 10DLC registration guide (2025) — NotificationAPI developer guide

### Tertiary (LOW confidence)
- AI-driven channel selection claims — marketing claims from Knock, Courier; no verified open implementation; documented as v3+ anti-feature

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
