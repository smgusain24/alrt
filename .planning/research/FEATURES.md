# Feature Landscape

**Domain:** Multi-channel notification infrastructure — v1.1 new features
**Researched:** 2026-03-06
**Scope:** Generic outbound webhooks, SMS (Twilio), smart routing engine, push notifications (FCM/APNs)

---

## Context: What Already Exists

The following are live in v1.0 and are NOT addressed here. They are noted only to identify integration points:

- 6 channels: in-app, email, Slack, WhatsApp, Discord, Telegram
- Subscriber model with phone_number, email, discord_webhook_url, telegram_chat_id
- Per-channel preferences (opt-in/out, DND windows, frequency caps)
- Visual workflow builder (trigger, channel, condition, delay nodes)
- Template management (CRUD, preview, node references)
- Dead letter queue with retry
- Inline subscriber upsert, scheduled delivery, metadata, bulk trigger
- Channel-specific Celery queues
- Per-team sending quotas

---

## Feature Area 1: Generic Outbound Webhooks

### Table Stakes

Features users expect from any webhook delivery channel. Missing = feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Dependency on Existing |
|---------|--------------|------------|----------------------|
| Webhook channel node in workflow builder | Core requirement — webhooks as a channel type | Low | Extends existing channel node system |
| HTTP POST to subscriber or team-configured URL | Baseline delivery mechanism | Low | New Celery task + existing task routing |
| HMAC-SHA256 request signing | Industry standard (Stripe, GitHub, Svix all use this); clients verify authenticity | Medium | New secret management per endpoint config |
| Configurable headers (Content-Type, Authorization, custom) | Client endpoints need auth headers to accept requests | Low | Part of endpoint config storage |
| Exponential backoff retry (at least 5 attempts, spanning ~24h) | Webhooks fail transiently; retries are assumed | Medium | Wraps existing DLQ + retry infrastructure |
| 2xx success / non-2xx failure semantics | Universal webhook contract | Low | Standard HTTP response handling |
| Delivery log entry per attempt (status, HTTP code, response body snippet, latency) | Debugging failed deliveries is the primary support complaint | Medium | Extends existing notifications/activity table |
| Configurable timeout per request (default 30s) | Prevents hung delivery tasks blocking queue workers | Low | Celery task timeout config |

### Differentiators

Features that set alrt apart in this space. Not universally expected, but valued by developers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Webhook as "universal channel primitive" — any future integration is a webhook template | Infinite channel extensibility without native integrations | Medium | Core architecture decision already in PROJECT.md |
| Payload templating (same Liquid/Mustache template engine as email) | Consistent developer experience across channels | Medium | Reuses existing template infrastructure |
| Test delivery button in dashboard (send sample payload to endpoint) | Fastest path to verifying endpoint config | Low | Dashboard + one-shot API call |
| Per-attempt response body stored in delivery log | Power users want to see what their endpoint returned | Medium | Truncate to ~2KB; store in JSONB |
| Endpoint health monitoring (auto-disable after N consecutive failures, dashboard alert) | Prevents quota burn on dead endpoints | Medium | Depends on consecutive failure tracking |
| BYOC signing secret (user provides their own secret rather than alrt-generated) | Enterprise pattern; Stripe-compatible | Low | Optional field on endpoint config |

### Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Inbound webhook receiver (receiving events from third parties) | Different product — that's Hookdeck/Zapier territory | Generic outbound only; document inbound as out of scope |
| Webhook fan-out to multiple URLs per trigger | Multiplies quota usage; adds orchestration complexity | One URL per webhook channel node; multiple nodes if needed |
| Webhook schema validation / contract testing | Not a notification concern — belongs in API testing tools | Omit; document that validation is client's responsibility |
| Real-time webhook consumer portal (white-label management for clients' clients) | Svix does this; it's a standalone product | Out of scope for v1.1; alrt is the sender not the PaaS |
| GraphQL over webhooks / subscription protocols | Niche; most endpoints expect plain JSON POST | Omit entirely |

### Feature Dependencies

```
Webhook channel node → Celery webhook delivery task (new)
Celery webhook delivery task → HMAC signing (new secret per endpoint)
HMAC signing → Endpoint config storage (new webhook_endpoints table or JSONB in node config)
Delivery log → Existing notifications table (extend with response_body column)
Retry → Existing DLQ infrastructure (reuse, no changes needed)
Payload templating → Existing template system (reuse template_id reference pattern)
```

---

## Feature Area 2: SMS via Twilio

### Table Stakes

| Feature | Why Expected | Complexity | Dependency on Existing |
|---------|--------------|------------|----------------------|
| SMS channel node in workflow builder | Core channel delivery | Low | Extends existing 6-channel node system |
| Delivery via alrt's shared Twilio account (no client Twilio account needed) | Matches alrt's "zero accounts" value prop from email/Slack | Medium | New Twilio API integration + shared credentials in config |
| phone_number on subscriber profile | Already exists (added for WhatsApp in v1.0) | None | Already built (WA-02) |
| Basic transactional message body (text only, no MMS) | SMS is text-first; MMS adds cost + complexity | Low | Simple string payload |
| STOP/UNSUBSCRIBE opt-out handling (Twilio handles automatically for long codes) | Legal requirement (TCPA); Twilio enforces by default | Low | Twilio handles automatically; alrt must sync opt-out to subscriber preferences |
| Delivery status tracking (sent/delivered/failed) via Twilio status callback | Industry expectation; already pattern from WhatsApp | Medium | New webhook receiver for Twilio status callbacks |
| Phone number format validation (E.164) before sending | Prevents Twilio API errors; saves cost | Low | Pydantic validator on trigger/subscriber schema |
| Delivery log entry per SMS | Consistent with all other channels | Low | Existing notifications table |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| BYOC Twilio account (own Account SID + Auth Token) for white-label tier | Enterprise isolation; own sender identity | Medium | Aligns with WL-02 pattern from email/WhatsApp BYOC |
| Sender ID / shortcode config per team (white-label tier) | Own branding on SMS | Medium | Part of BYOC config; deferred to white-label phase |
| Delivery cost estimate in dashboard (Twilio pricing per country) | Transparency builds trust; prevents surprise bills | High | Requires Twilio pricing API lookup — defer |
| Template support for SMS body (same template engine) | DX consistency | Low | Reuses existing template system |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| MMS (images/media) | 3x cost, carrier fragmentation, compliance complexity | Text-only SMS; document MMS as out of scope |
| Two-way SMS (reply handling, conversational) | Different product (Twilio Conversations); not a notification primitive | Outbound only; STOP/START handled automatically by Twilio |
| Number provisioning UI (buy a Twilio number from alrt dashboard) | Ops complexity; carrier registration (10DLC) takes days | Use alrt's shared number pool; BYOC for white-label |
| 10DLC campaign registration UI | Multi-week process involving carriers; not self-serve | Alrt registers its own 10DLC campaigns for shared pool; BYOC teams register their own |
| International SMS routing optimization | Carrier complexity; cost optimization is a separate product | Use Twilio's default routing; flag international as caveat |

### Compliance Notes (HIGH confidence — regulatory, not optional)

- **TCPA (US):** Twilio auto-handles STOP/UNSUBSCRIBE for long code and toll-free numbers. Alrt must update subscriber's SMS preference to opted-out when Twilio fires a STOP callback.
- **10DLC registration:** Alrt's shared Twilio number pool must be 10DLC-registered. This is an ops task, not a code task. New in 2025 — mandatory for US A2P SMS.
- **FCC 2025 opt-out rule (April 2025):** Keywords STOP, UNSUBSCRIBE, END, QUIT, STOPALL, REVOKE, OPTOUT, CANCEL all trigger opt-out. Twilio handles automatically.
- **Toll-free numbers:** STOP/UNSTOP only (no UNSUBSCRIBE etc.). Use shared long code pool for flexibility.

### Feature Dependencies

```
SMS channel node → phone_number on subscriber (already exists from WA-02)
SMS channel node → Twilio Python SDK in workers (new dependency)
Delivery status → Twilio status callback endpoint in API (new route)
Status callback → Sync opt-out to subscriber preferences (existing preference system)
BYOC → Team-level Twilio credentials storage (extend existing provider_config pattern)
```

---

## Feature Area 3: Smart Routing Engine

### What Smart Routing Is

Smart routing sits between the trigger API and channel delivery. Instead of executing all channel nodes in a workflow unconditionally, the routing engine evaluates subscriber state (preferences, DND, channel availability) and priority rules to decide which channel to attempt, in what order, and when to fall back.

This is NOT a new node type — it's cross-cutting logic that runs before channel delivery tasks execute.

### Table Stakes

| Feature | Why Expected | Complexity | Dependency on Existing |
|---------|--------------|------------|----------------------|
| Respect per-channel subscriber opt-out preferences before delivery | Without this, preference system is decorative | Medium | Extends existing step_runner to check preferences before enqueuing channel task |
| Skip channel delivery if subscriber lacks required contact info (no phone → skip SMS, no email → skip email) | Prevents silent failures and error logs | Low | Contact info check in step_runner |
| Respect DND windows — defer or skip channel delivery during subscriber's DND hours | DND is a trust feature; ignoring it breaks user trust | Medium | Existing DND stored in preferences; need enforcement in step_runner |
| Respect frequency caps — skip channel if subscriber has received too many notifications in the cap window | Prevents notification fatigue; already stored in preferences | Medium | Existing cap data; need enforcement query in step_runner |
| Per-channel delivery confirmation status visible per execution (which channels fired, which skipped, which failed) | Operators need to understand why a notification wasn't sent | Low | Extend notifications table status field |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Priority-ordered fallback chains (try push → if undelivered in X minutes → fall back to SMS → fall back to email) | The most-requested routing primitive; Courier and Knock both highlight this | High | Requires delivery confirmation handoff + timeout scheduling |
| Visual fallback chain builder in workflow UI (drag channel nodes into priority order, set timeout between attempts) | Makes complex routing accessible to non-engineers | High | New workflow node type: "route" or priority block |
| Channel selection via subscriber preferred_channel field (subscriber explicitly chooses their preferred channel) | Respects explicit user preference without requiring complex rules | Low | New field on subscribers table; honor in step_runner |
| Global routing rules per team (e.g., "always try in-app first for all workflows") | Power user feature; reduces repetition across workflows | Medium | New team-level routing config table |
| Soft fallback: mark original channel as "unacknowledged" instead of "delivered" for in-app (no read receipt) | More honest delivery semantics | Medium | Requires distinguishing sent vs acknowledged for in-app |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| AI/ML-driven channel selection (learns best channel per user from history) | Requires ML infrastructure, training data, real-time inference — massive scope | Priority ordering is explicit and predictable; document AI routing as v3+ |
| Cross-subscriber routing (route to different subscriber based on content) | Changes the notification data model fundamentally | Routing is always per-subscriber |
| SLA-based escalation (page on-call if unacknowledged for 1h) | PagerDuty territory; not a notification primitive | Generic webhooks to PagerDuty/OpsGenie are the answer |
| Real-time channel health scoring (auto-deprioritize a channel if provider is degraded) | Requires live provider health monitoring — ops complexity | Document as future; use static priority ordering now |

### Implementation Notes (inform phase complexity)

**Fallback chain complexity is HIGH.** The core technical challenge is: after sending to channel A, how does the system know to send to channel B? Options:

1. **Timeout-based poller** (simplest): After channel A task completes, a scheduled task wakes up after the timeout and checks if delivery was acknowledged. If not, enqueues channel B. Uses existing Beat + scheduled_steps pattern.
2. **Delivery webhook callback** (most accurate for real delivery confirmation): Channels that support read receipts (WhatsApp read, in-app acknowledge) fire a callback that cancels the fallback timer.
3. **Optimistic fallback** (simplest to implement, least accurate): Always fire all channels in sequence after fixed delays; no confirmation. This is what most teams build first.

Recommendation: Start with timeout-based poller (option 1) using existing Beat infrastructure. Delivery confirmation callbacks are a differentiator to add later.

**DND and frequency cap enforcement** are Medium complexity because they require:
- Reading subscriber preferences before each channel task
- The cap window requires a COUNT query on recent notifications — must be efficient (existing index helps)
- DND requires timezone-aware datetime comparison

### Feature Dependencies

```
Preference enforcement → Existing preferences table + step_runner (extend, not replace)
DND enforcement → Existing DND fields in preferences; need timezone-aware check in step_runner
Frequency cap → Existing cap data; need count query on notifications table before delivery
Fallback chains → New "routing block" workflow node + timeout poller (reuses Beat pattern)
preferred_channel field → New column on subscribers table
Delivery confirmation → Extends existing notification status enum (add "acknowledged" state)
```

---

## Feature Area 4: Push Notifications (FCM/APNs)

### Table Stakes

| Feature | Why Expected | Complexity | Dependency on Existing |
|---------|--------------|------------|----------------------|
| Android push via Firebase Cloud Messaging (FCM) | FCM covers all Android devices; industry standard | Medium | New firebase-admin Python SDK in workers |
| iOS push via APNs (through FCM as unified broker) | FCM can route to APNs — one SDK covers both | Low | Same FCM integration covers iOS via APNs bridge |
| Device token registration API (POST /subscribers/:id/devices) | Clients must register device tokens before push can be sent | Medium | New devices table; new API route |
| Multiple devices per subscriber | Users have phones + tablets; tokens are device-scoped not user-scoped | Low | One subscriber : many device tokens (1:N) |
| Push channel node in workflow builder | Core channel delivery | Low | Extends existing channel node system |
| Basic notification payload (title, body, data object) | Minimum viable push notification | Low | Standard FCM message format |
| Delivery status per token (success/failed/token_invalid) | Token invalidity is common; must track to prune stale tokens | Medium | Extend notifications table; FCM returns token errors |
| Auto-prune invalid/stale tokens on delivery failure | FCM returns UNREGISTERED error for stale tokens; retrying wastes quota | Medium | Token status update in Celery task on FCM error |
| Token update endpoint (client updates token on app launch) | FCM tokens refresh; clients must be able to update | Low | PATCH /subscribers/:id/devices/:device_id |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Web push (VAPID) in addition to mobile | Reaches desktop users without an app | High | Separate from FCM/APNs; different key management (VAPID keys) — defer |
| Rich push (images, action buttons) | Higher engagement than text-only | Medium | FCM supports this natively; requires payload schema extension |
| Silent/data-only push (background sync trigger) | Enables app background refresh patterns | Low | FCM data message vs notification message distinction |
| BYOC FCM project (own Firebase project) | Sends from client's own Firebase project — no vendor lock-in | Medium | Aligns with BYOC pattern from email/WhatsApp |
| APNs direct integration (without FCM intermediary) | Lower latency for iOS; avoids Google dependency | High | Requires APNs HTTP/2 + p8 key management — defer; FCM covers this |
| Notification click tracking (did user tap the notification?) | Engagement metric | High | Requires in-app SDK instrumentation; out of scope |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Push notification UI components / SDK | Alrt is headless; clients build their own | Document how to register tokens from any mobile SDK |
| Topic-based push (broadcast to all subscribers of a topic) | Breaks alrt's per-subscriber model; topic fan-out is massive scale | Bulk trigger endpoint already covers this use case |
| Push campaign scheduling / A/B testing | Marketing automation territory | Deliver_at scheduling covers timing; A/B is deferred |
| APNS direct integration (bypassing FCM) | Adds p8 cert management, HTTP/2 connection pooling complexity | FCM covers iOS through APNS bridge; document this clearly |
| Web push / VAPID | Different protocol, key management, browser registration flow | Defer to v3+; mobile push is the priority |

### Token Lifecycle (inform database schema)

Device tokens are the hardest part of push. Key lifecycle events that must be handled:

1. **App install / first launch** → Client registers token via POST /subscribers/:id/devices
2. **Token refresh** (FCM refreshes tokens periodically) → Client calls PATCH /devices/:id with new token
3. **App uninstall** → FCM silently invalidates token; first send attempt returns UNREGISTERED error → alrt marks token inactive
4. **User logout** → Client calls DELETE or deactivates token
5. **30+ days inactive** → FCM considers token stale but still accepts sends; failure rate rises → alrt should mark tokens inactive after 30 days without a seen_at update
6. **270+ days inactive** → FCM rejects sends with UNREGISTERED → auto-prune

```
devices table:
  id UUID
  subscriber_id UUID FK
  team_id UUID FK
  platform ENUM (fcm_android, fcm_ios, apns_direct, web_vapid)
  token TEXT UNIQUE
  is_active BOOLEAN DEFAULT TRUE
  last_seen_at TIMESTAMP  -- updated on token refresh call
  created_at TIMESTAMP
  updated_at TIMESTAMP
```

### Feature Dependencies

```
Push channel node → Device token lookup (query all active tokens for subscriber)
Device token lookup → devices table (new)
FCM delivery → firebase-admin Python SDK (new worker dependency)
FCM delivery task → Channel-specific Celery queue (extend existing queue routing)
Token invalidity handling → Mark token inactive on UNREGISTERED FCM error
Token registration → New API routes: POST/PATCH/DELETE /subscribers/:id/devices
BYOC FCM → Team-level Firebase credentials (extend provider_config pattern)
```

---

## Cross-Feature Dependencies

```
Webhooks ──────────────────────┐
SMS ────────────────────────── ├─→ Smart routing engine (routing respects ALL channels)
Push ───────────────────────── ┘

Smart routing requires ALL channels to expose:
  - "can this channel deliver to this subscriber?" check (contact info + preference)
  - Delivery confirmation / status update hook

Webhooks as primitive → SMS BYOC could be modeled as a webhook to Twilio
Push token registration → Subscriber model extension (already extended for WhatsApp phone)
SMS STOP sync → Subscriber preferences system (existing)
Fallback chain timeouts → Beat scheduler (existing infrastructure)
```

---

## MVP Recommendation

### What to build first (maximum value, minimum risk)

**Phase A — Webhooks (foundation)**
1. Webhook channel node (delivery only, no HMAC yet) — validates the architecture works
2. Exponential backoff retry using existing DLQ infrastructure
3. Delivery log in activity feed

Then add HMAC signing — a self-contained security layer on top.

Rationale: Webhooks are the "universal channel primitive." Getting them right validates the architecture for all future channels. Low risk — no external API dependency.

**Phase B — SMS via Twilio**
1. Phone number validation (E.164)
2. Twilio delivery via shared account
3. Status callback endpoint (delivery tracking)
4. STOP callback → sync to subscriber preferences

Rationale: Highest customer demand for critical transactional notifications (verification codes, payment alerts). Existing phone_number field means subscriber model is ready.

**Phase C — Smart routing (preference enforcement first)**
1. DND window enforcement in step_runner (low complexity, immediate trust value)
2. Frequency cap enforcement in step_runner
3. preferred_channel field + honor in step_runner

Defer: Fallback chains (HIGH complexity, requires new workflow node type + timeout poller). Do in a dedicated phase.

**Phase D — Push notifications**
1. Device token registration API + devices table
2. FCM delivery (Android + iOS via bridge)
3. Token invalidity auto-prune

Rationale: Push requires client-side SDK integration work (outside alrt's control), so it's inherently slower to validate. Build the infrastructure, then iterate with real client feedback.

### Defer

| Feature | Reason |
|---------|--------|
| Fallback chain workflow node (visual builder + timeout poller) | High complexity; build after individual channels are stable |
| BYOC Twilio (own credentials) | White-label phase; implement alongside WL-01/WL-02 |
| BYOC FCM project | White-label phase |
| APNs direct integration (bypass FCM) | FCM bridge covers 95% of use cases |
| Web push (VAPID) | Mobile-first; web push is a separate protocol |
| AI-driven channel selection | v3+ |
| Webhook fan-out (multiple URLs) | Anti-feature; don't build |
| SMS MMS | Anti-feature; don't build |

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Webhook best practices (HMAC, retry, delivery semantics) | HIGH | Multiple verified sources: Svix docs, standard-webhooks spec, Hookdeck guides |
| Twilio SMS integration (Python SDK, opt-out handling) | HIGH | Official Twilio docs on STOP handling, FCC 2025 opt-out rule |
| TCPA/10DLC compliance requirements | HIGH | Official regulatory sources verified across multiple compliance guides |
| FCM/APNs token lifecycle | HIGH | Firebase official docs + Google engineering blog |
| Smart routing patterns (priority, fallback chains) | MEDIUM | Courier, Knock, SuprSend docs — all describe similar patterns but implementation details vary |
| AI-driven routing (engagement history) | LOW | Marketing claims from platforms; no verified open implementation |
| Fallback chain timeout best practices | MEDIUM | System design references; no single authoritative source for specific timeout values |

---

## Sources

- [Svix — Webhooks as a Service](https://www.svix.com/) — enterprise webhook delivery feature set
- [Standard Webhooks Specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) — HMAC signing standard
- [Twilio STOP opt-out handling](https://support.twilio.com/hc/en-us/articles/223134027-Twilio-support-for-opt-out-keywords-SMS-STOP-filtering) — authoritative opt-out keyword reference
- [FCC 2025 SMS Opt-Out Rule (Twilio)](https://www.twilio.com/en-us/blog/insights/best-practices/update-to-fcc-s-sms-opt-out-keywords) — April 2025 regulatory update
- [Firebase FCM Token Management Best Practices](https://firebase.google.com/docs/cloud-messaging/manage-tokens) — official Google documentation
- [Firebase FCM on Android (2025)](https://firebase.blog/posts/2025/04/fcm-on-android/) — recent FCM guidance
- [Courier: Push Notification Fallbacks](https://www.courier.com/blog/push-notification-fallbacks-ensuring-message-delivery-with-email-slack-sms) — fallback chain patterns in production
- [System Design: Notification System](https://www.systemdesignhandbook.com/guides/design-a-notification-system/) — routing + fallback architecture reference
- [Knock: Top Notification Platforms 2026](https://knock.app/blog/the-top-notification-infrastructure-platforms-for-developers) — competitive feature landscape
- [TCPA Compliance 2025](https://www.voxie.com/blog/tcpa-compliance-checklist-sms/) — SMS regulatory requirements
- [NotiGrid: Webhooks for Custom Integrations](https://notigrid.com/blog/webhooks-for-custom-integrations) — webhook channel patterns
- [Spritle: Push Notifications Deep Dive APNs & FCM](https://www.spritle.com/blog/push-notifications-deep-dive-the-ultimate-technical-guide-to-apns-fcm/) — technical implementation guide
