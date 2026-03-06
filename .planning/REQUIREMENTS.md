# Requirements: Alrt

**Defined:** 2026-02-28
**Core Value:** One API key replaces 5 integrations — full-stack notifications infrastructure

---

## Milestone 2 Requirements (Active Build)

### MVP Completion

- [ ] **MVP-01**: Dashboard shows real-time activity feed of all notification events with delivery status per channel
- [ ] **MVP-02**: Dashboard shows analytics — total notifications sent, per-channel breakdown, failure rates (last 7/30 days)
- [ ] **MVP-03**: Team admin can invite members by email; invited members have admin or viewer roles
- [ ] **MVP-04**: JWT cookie has httponly=True flag (security fix — current implementation exposes token to JS)

### Shared Infrastructure

- [x] **INFRA-01**: Startup can trigger email delivery without providing their own SendGrid/Resend credentials (alrt uses its own shared sending account)
- [x] **INFRA-02**: Startup can connect Slack workspace via alrt's OAuth app without registering their own Slack app
- [x] **INFRA-03**: Each team's sending is quota-tracked to prevent abuse of shared infrastructure

### Platform Hardening

- [ ] **TRIG-01**: `POST /events/trigger` accepts inline subscriber object (`subscriber: { id, email, name, phone, data }`) with upsert semantics — no pre-registration step required
- [ ] **TRIG-02**: `POST /events/trigger` accepts `deliver_at` datetime — schedules execution for future delivery without a delay workflow node
- [ ] **TRIG-03**: `POST /events/trigger` accepts `metadata` dict — attached to execution, filterable in activity feed and analytics
- [ ] **TRIG-04**: `POST /events/trigger-bulk` accepts array of inline subscriber objects (up to 1000) — triggers one workflow execution per subscriber; supersedes BULK-01
- [ ] **BULK-01**: Developer can trigger the same workflow for up to 1000 subscribers in a single API call (`POST /events/trigger-bulk`) *(superseded by TRIG-04)*
- [ ] **COND-01**: Workflow conditions support numeric operators (greater_than, less_than, between)
- [ ] **COND-02**: Workflow conditions support string operators (contains, starts_with, regex)
- [ ] **WF-01**: Workflow save/publish validates graph — rejects cycles, dangling edges, missing trigger node
- [ ] **FIX-01**: Delay node resume passes full subscriber context (fixes known bug where subscriber_id/team_id are None on resume)
- [ ] **FIX-02**: Redis connections use context managers consistently (fixes connection leak under load)
- [ ] **FIX-03**: Idempotency check uses Redis SET NX (atomic) instead of GET-then-SET — eliminates race condition on concurrent triggers with same key
- [ ] **RETRY-01**: Notifications that exhaust all delivery retries are stored in a dead letter queue; dashboard surfaces permanently failed notifications with one-click retry
- [ ] **SCALE-01**: Channel delivery tasks (email, slack, inapp) routed to dedicated Celery queues — prevents one channel's load from blocking delivery on others
- [ ] **PREF-01**: `GET /subscribers/:id/preferences` + `PUT /subscribers/:id/preferences` accessible with client key (`alrt_ck_`) — enables in-app preference centers without exposing server credentials
- [ ] **TMPL-01**: Templates are first-class API resources — create/update/preview independently of workflows; channel nodes reference a template ID rather than embedding content inline
- [ ] **DATA-01**: Notifications older than 90 days are archived; active-window queries use covering indexes — prevents unbounded table growth degrading query performance

### WhatsApp Channel

- [ ] **WA-01**: Developer can trigger WhatsApp message delivery via standard `/events/trigger` API call
- [x] **WA-02**: Subscriber profile supports `phone_number` field for WhatsApp delivery
- [ ] **WA-03**: WhatsApp message templates configurable in the workflow builder channel node
- [ ] **WA-04**: WhatsApp delivery status tracked (sent/delivered/read/failed) in notifications table

### Discord Channel

- [x] **DC-01**: Developer can trigger Discord message delivery via standard `/events/trigger` API call using subscriber's `discord_webhook_url`
- [ ] **DC-02**: Discord messages support embed formatting (title, body, color) configurable in workflow builder channel node
- [ ] **DC-03**: Discord delivery status tracked (sent/failed) in notifications table

### Telegram Channel

- [x] **TG-01**: Developer can trigger Telegram message delivery via standard `/events/trigger` API call using subscriber's `telegram_chat_id`
- [ ] **TG-02**: Telegram messages support Markdown formatting configurable in workflow builder channel node
- [ ] **TG-03**: Telegram delivery status tracked (sent/failed) in notifications table

### White-Label & Pricing

- [ ] **WL-01**: Team on Pro tier can verify a custom sending domain (adds DNS record, alrt sends from their domain)
- [ ] **WL-02**: Team on Business tier can connect their own WhatsApp Business Account number
- [ ] **WL-03**: Pricing tier is enforced — free/starter teams send from alrt domains; Pro+ send from own domain
- [ ] **WL-04**: Dashboard shows current tier and white-label status

---

## v2 Requirements (Deferred)

### SMS Channel
- **SMS-01**: Developer can trigger SMS delivery via `/events/trigger`
- **SMS-02**: Subscriber profile supports `phone_number` for SMS delivery
- **SMS-03**: alrt uses Twilio shared account; BYOC Twilio SID for white-label tier

### Push Notifications
- **PUSH-01**: Developer can trigger web push notifications
- **PUSH-02**: Developer can trigger mobile push (iOS + Android) via Firebase
- **PUSH-03**: Subscriber profile supports push tokens

### Advanced Analytics
- **ANAL-01**: Delivery open rate tracking for email
- **ANAL-02**: Link click tracking in email templates
- **ANAL-03**: A/B test variant support on workflow channel nodes

### Outgoing Webhooks
- **WH-01**: Workflow supports webhook delivery channel (outbound POST to client-specified URL)
- **WH-02**: Webhook delivery has retry with exponential backoff
- **WH-03**: Webhook delivery logs in activity feed

### Digest & Batching
- **DIG-01**: Workflow supports digest node (collect N notifications, deliver as one summary)
- **DIG-02**: Digest cadence configurable (hourly, daily, weekly)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pre-built notification UI components | alrt is headless; clients build their own UI |
| Marketing automation / drip campaigns | Different product category |
| Self-hosted / on-prem | Not a priority for startup market |
| CRM / user segmentation | Out of product scope |
| Microsoft Teams channel | V3+ |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MVP-01 | Phase 1 | Pending |
| MVP-02 | Phase 1 | Pending |
| MVP-03 | Phase 1 | Pending |
| MVP-04 | Phase 1 | Pending |
| INFRA-01 | Phase 2 | Complete |
| INFRA-02 | Phase 2 | Complete |
| INFRA-03 | Phase 2 | Complete |
| TRIG-01 | Phase 3 | Complete |
| TRIG-02 | Phase 3 | Complete |
| TRIG-03 | Phase 3 | Complete |
| TRIG-04 | Phase 3 | Complete |
| BULK-01 | Phase 3 | Superseded by TRIG-04 |
| COND-01 | Phase 3 | Complete |
| COND-02 | Phase 3 | Complete |
| WF-01 | Phase 3 | Complete |
| FIX-01 | Phase 1 | Pending |
| FIX-02 | Phase 3 | Complete |
| FIX-03 | Phase 3 | Complete |
| RETRY-01 | Phase 3 | Complete |
| SCALE-01 | Phase 3 | Complete |
| PREF-01 | Phase 3 | Complete |
| TMPL-01 | Phase 3 | Complete |
| DATA-01 | Phase 3 | Complete |
| WA-01 | Phase 4 | Pending |
| WA-02 | Phase 4 | Complete |
| WA-03 | Phase 4 | Pending |
| WA-04 | Phase 4 | Pending |
| DC-01 | Phase 4 | Complete |
| DC-02 | Phase 4 | Pending |
| DC-03 | Phase 4 | Pending |
| TG-01 | Phase 4 | Complete |
| TG-02 | Phase 4 | Pending |
| TG-03 | Phase 4 | Pending |
| WL-01 | Phase 5 | Pending |
| WL-02 | Phase 5 | Pending |
| WL-03 | Phase 5 | Pending |
| WL-04 | Phase 5 | Pending |

**Coverage:**
- Milestone 2 requirements: 37 total (27 original + TRIG-01–04 + DC-01–03 + TG-01–03)
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Updated: 2026-03-01 — Added RETRY-01, SCALE-01, FIX-03, PREF-01, TMPL-01, DATA-01; WA moved to Phase 4, WL to Phase 5*
*Updated: 2026-03-06 — WA-02, DC-01, TG-01 marked complete (04-01: subscriber model extensions + channel routing foundation)*
