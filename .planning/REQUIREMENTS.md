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

- [ ] **INFRA-01**: Startup can trigger email delivery without providing their own SendGrid/Resend credentials (alrt uses its own shared sending account)
- [ ] **INFRA-02**: Startup can connect Slack workspace via alrt's OAuth app without registering their own Slack app
- [ ] **INFRA-03**: Each team's sending is quota-tracked to prevent abuse of shared infrastructure

### WhatsApp Channel

- [ ] **WA-01**: Developer can trigger WhatsApp message delivery via standard `/events/trigger` API call
- [ ] **WA-02**: Subscriber profile supports `phone_number` field for WhatsApp delivery
- [ ] **WA-03**: WhatsApp message templates configurable in the workflow builder channel node
- [ ] **WA-04**: WhatsApp delivery status tracked (sent/delivered/read/failed) in notifications table

### White-Label & Pricing

- [ ] **WL-01**: Team on Pro tier can verify a custom sending domain (adds DNS record, alrt sends from their domain)
- [ ] **WL-02**: Team on Business tier can connect their own WhatsApp Business Account number
- [ ] **WL-03**: Pricing tier is enforced — free/starter teams send from alrt domains; Pro+ send from own domain
- [ ] **WL-04**: Dashboard shows current tier and white-label status

### Platform Hardening

- [ ] **BULK-01**: Developer can trigger the same workflow for up to 1000 subscribers in a single API call (`POST /events/trigger-bulk`)
- [ ] **COND-01**: Workflow conditions support numeric operators (greater_than, less_than, between)
- [ ] **COND-02**: Workflow conditions support string operators (contains, starts_with, regex)
- [ ] **WF-01**: Workflow save/publish validates graph — rejects cycles, dangling edges, missing trigger node
- [ ] **FIX-01**: Delay node resume passes full subscriber context (fixes known bug where subscriber_id/team_id are None on resume)
- [ ] **FIX-02**: Redis connections use context managers consistently (fixes connection leak under load)

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
| Discord / Teams channels | V3+ |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MVP-01 | Phase 1 | Pending |
| MVP-02 | Phase 1 | Pending |
| MVP-03 | Phase 1 | Pending |
| MVP-04 | Phase 1 | Pending |
| INFRA-01 | Phase 2 | In Progress (02-01 schema done) |
| INFRA-02 | Phase 2 | In Progress (02-01 schema done) |
| INFRA-03 | Phase 2 | In Progress (02-01 schema done) |
| WA-01 | Phase 3 | Pending |
| WA-02 | Phase 3 | Pending |
| WA-03 | Phase 3 | Pending |
| WA-04 | Phase 3 | Pending |
| WL-01 | Phase 4 | Pending |
| WL-02 | Phase 4 | Pending |
| WL-03 | Phase 4 | Pending |
| WL-04 | Phase 4 | Pending |
| BULK-01 | Phase 5 | Pending |
| COND-01 | Phase 5 | Pending |
| COND-02 | Phase 5 | Pending |
| WF-01 | Phase 5 | Pending |
| FIX-01 | Phase 1 | Pending |
| FIX-02 | Phase 5 | Pending |

**Coverage:**
- Milestone 2 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after strategy session*
