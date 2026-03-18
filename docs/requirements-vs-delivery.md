# Requirements vs Delivery: Startup Notification Infrastructure

> What does a startup/mid-size startup actually need from a notification system, and does alrt deliver it?

---

## How to Read This Document

- **Requirement**: What a startup would realistically need
- **Priority**: P0 (must-have day 1), P1 (need within first month), P2 (need as you scale), P3 (nice-to-have)
- **Status**: Delivered / Partial / Planned / Gap

---

## 1. Core Notification Delivery

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 1.1 | Send email notifications | P0 | Delivered | alrt-hosted (Resend) + BYOC (SendGrid/Resend). Template rendering with Jinja2. |
| 1.2 | In-app notification feed | P0 | Delivered | Headless API + real-time WebSocket via Redis Pub/Sub. Mark read/archive. |
| 1.3 | Slack notifications | P1 | Delivered | OAuth app flow. DM or channel targeting. Block Kit support. |
| 1.4 | SMS notifications | P1 | Planned (v1.1) | phone_number field exists on subscribers. Twilio integration planned. |

| 1.5 | WhatsApp notifications | P2 | Delivered | Meta Cloud API. Template + freeform messaging. Delivery status webhooks. |
| 1.6 | Discord notifications | P2 | Delivered | Webhook-based embeds. Subscriber or team-level webhook URLs. |
| 1.7 | Telegram notifications | P2 | Delivered | Bot API. Markdown support. Rate-limit aware retry. |
| 1.8 | Push notifications (web/mobile) | P1 | Planned (v1.1) | FCM/APNs integration planned. No subscriber push token field yet. |
| 1.9 | Outbound webhooks | P1 | Planned (v1.1) | POST to client-specified URLs. Critical for custom integrations. |

**Verdict**: 6/9 channels delivered. SMS and push (the two most common startup needs after email + in-app) are planned for v1.1. Webhook support also planned.

---

## 2. API & Developer Experience

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 2.1 | Single API key to start sending | P0 | Delivered | `alrt_sk_` server key created on signup. One key, all channels. |
| 2.2 | Simple trigger API (one call to send) | P0 | Delivered | `POST /events/trigger` with inline subscriber upsert. Zero pre-registration. |
| 2.3 | Bulk send (marketing/transactional batches) | P1 | Delivered | `POST /events/trigger-bulk` supports up to 1000 subscribers per call. |
| 2.4 | Idempotency (safe retries) | P1 | Delivered | Atomic Redis SET NX with 24h TTL. Duplicate detection returns `status: "duplicate"`. |
| 2.5 | Scheduled/delayed delivery | P1 | Delivered | `deliver_at` field on trigger. Celery Beat polls every 30s. |
| 2.6 | API rate limiting | P1 | Delivered | SlowAPI middleware. Configurable read/write limits. |
| 2.7 | OpenAPI/Swagger docs | P0 | Delivered | Interactive docs page at `/docs`. |
| 2.8 | Client-side SDK (npm package) | P1 | Gap | TypeScript SDK exists but deprecated. API-first approach — no maintained SDK. |
| 2.9 | Server-side SDKs (Python, Node, Go) | P2 | Gap | No server SDKs. Startups must use raw HTTP. |
| 2.10 | Webhook event callbacks | P2 | Partial | WhatsApp delivery status webhooks exist. No generic webhook events for other channels. |

**Verdict**: Core DX is strong (single key, one-call trigger, inline upsert). SDK gap means more integration work for developers. Most startups can work with raw HTTP but SDKs accelerate adoption.

---

## 3. Workflow & Routing

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 3.1 | Event-to-notification mapping | P0 | Delivered | 1:1 event_name to workflow mapping. |
| 3.2 | Visual workflow builder | P1 | Delivered | Drag-drop builder with 4 node types (trigger, channel, condition, delay). Undo/redo. |
| 3.3 | Conditional branching | P1 | Delivered | 8 operators: equals, not_equals, exists, greater_than, less_than, between, contains, starts_with, regex. |
| 3.4 | Delay/wait nodes | P1 | Delivered | Persisted to `scheduled_steps` table. Celery Beat polls every 30s. |
| 3.5 | Multi-channel in one workflow | P0 | Delivered | Single workflow can have email + slack + in_app + any combination. |
| 3.6 | Smart routing (try channel A, fallback to B) | P2 | Planned (v1.1) | Priority fallback chains planned. Currently all channels fire in parallel. |
| 3.7 | Channel filtering at trigger time | P1 | Delivered | `channels` field on trigger restricts which channels fire. Warnings for unmatched channels. |
| 3.8 | Workflow versioning | P2 | Gap | No version history. Editing a workflow overwrites the definition. |
| 3.9 | A/B testing for notification content | P3 | Gap | No variant support. Would need template variants + analytics integration. |

**Verdict**: Workflow engine is solid for most startup needs. Smart routing (the #1 feature for reducing notification fatigue) is planned. Workflow versioning would help teams iterate safely.

---

## 4. Subscriber Management

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 4.1 | Create/manage subscribers via API | P0 | Delivered | Full CRUD + inline upsert on trigger. |
| 4.2 | Per-subscriber channel preferences | P0 | Delivered | Global opt-out, category-specific, DND windows, frequency caps. |
| 4.3 | Subscriber preference center (client-facing) | P1 | Partial | API exists (client key accessible). No pre-built UI component. Startups must build their own preference center. |
| 4.4 | Custom properties/metadata on subscribers | P1 | Delivered | `custom_properties` JSONB field. Usable in templates via `{{subscriber.custom_properties.field}}`. |
| 4.5 | Subscriber segmentation/groups | P2 | Gap | No group/segment model. Must filter at trigger time. |
| 4.6 | Subscriber import (CSV/bulk) | P2 | Gap | Must use API calls. No bulk import endpoint or dashboard upload. |
| 4.7 | Unsubscribe link in emails | P1 | Gap | No auto-generated unsubscribe links. Must be manually added to templates. |

**Verdict**: Core subscriber management is complete. Preference API is strong but lacks a drop-in UI. Missing unsubscribe link generation is a compliance concern (CAN-SPAM/GDPR).

---

## 5. Observability & Debugging

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 5.1 | Activity feed (what was sent, to whom, when) | P0 | Delivered | Real-time feed with filters (subscriber, event, status, channel, date range). |
| 5.2 | Per-notification delivery status | P0 | Delivered | Status tracking: pending -> sent/failed/dead_letter. Error reasons stored. |
| 5.3 | Analytics dashboard | P1 | Delivered | Overview metrics, per-channel breakdown (success %), per-workflow metrics, timeline chart. |
| 5.4 | Dead letter queue + retry | P1 | Delivered | Permanently failed notifications surfaced. One-click retry via API. |
| 5.5 | Delivery webhooks (status callbacks to your app) | P2 | Partial | WhatsApp only. No generic delivery status callbacks for email/slack/etc. |
| 5.6 | Audit log | P1 | Delivered | `event_logs` table captures method, path, status_code, latency, request/response. |
| 5.7 | Alerting on delivery failures | P2 | Gap | No built-in alerts when failure rate spikes. Must monitor externally. |
| 5.8 | Notification content preview/search | P2 | Partial | Template preview exists. No full-text search across sent notifications. |

**Verdict**: Observability is above average for the category. Activity feed + DLQ + analytics cover most debugging needs. Missing delivery webhooks and failure alerting are gaps for production-grade usage.

---

## 6. Team & Access Control

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 6.1 | Team-based multi-tenancy | P0 | Delivered | All resources scoped by team_id. No cross-team access. |
| 6.2 | Team member invites | P1 | Delivered | Email-based invites with admin/viewer roles. 7-day token expiry. |
| 6.3 | Role-based access control | P1 | Partial | admin/viewer roles exist. No fine-grained permissions (e.g., "can edit workflows but not manage billing"). |
| 6.4 | API key management (create/revoke) | P0 | Delivered | Server + client key types. Last-used tracking. |
| 6.5 | SSO/OAuth login | P2 | Gap | Email/password only. No Google/GitHub/SAML SSO. |
| 6.6 | Environments (dev/staging/prod) | P2 | Gap | Single environment per team. Must create separate teams for staging/prod. |

**Verdict**: Basic team management works. RBAC and environments are gaps that matter as teams grow beyond 5-10 people.

---

## 7. Reliability & Scale

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 7.1 | Retry with exponential backoff | P0 | Delivered | All 6 channels have retry policies (max 3 retries). Permanent vs transient error distinction. |
| 7.2 | Per-channel queues (isolation) | P0 | Delivered | Dedicated Celery queues prevent one channel's load from blocking others. |
| 7.3 | Sending quotas/rate limits | P1 | Delivered | Per-team monthly quotas tracked. Soft-limit enforcement (warning, not blocking). |
| 7.4 | Horizontal scaling | P1 | Delivered | Stateless API + Celery workers scale independently. Redis pub/sub for fan-out. |
| 7.5 | 99.9% delivery SLA | P2 | Gap | No formal SLA. Retry + DLQ provide best-effort reliability. |
| 7.6 | End-to-end encryption | P2 | Partial | Provider credentials encrypted (Fernet). Notification content stored in plaintext. |
| 7.7 | Data retention policies | P1 | Delivered | 90-day notification retention. Celery Beat auto-archives. |

**Verdict**: Architecture is sound for startup scale (dedicated queues, retry policies, DLQ). No formal SLA but the building blocks are there.

---

## 8. Compliance & Security

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 8.1 | HTTPS/TLS | P0 | Delivered | CORS configured. Deployment assumes TLS termination at load balancer. |
| 8.2 | API key hashing (not stored in plaintext) | P0 | Delivered | SHA-256 hashed. Only prefix stored for display. |
| 8.3 | Credential encryption | P0 | Delivered | Fernet encryption for provider secrets (Slack bot tokens, etc.). |
| 8.4 | GDPR subscriber deletion | P1 | Delivered | Soft delete (is_deleted flag) on subscribers. |
| 8.5 | CAN-SPAM compliance (unsubscribe) | P1 | Gap | No auto-generated unsubscribe links or one-click unsubscribe headers. |
| 8.6 | SOC 2 / compliance certifications | P2 | Gap | No formal compliance program. Expected for enterprise deals. |
| 8.7 | IP allowlisting for API keys | P3 | Gap | Any IP can use a valid API key. |
| 8.8 | Webhook signature verification | P1 | Partial | WhatsApp webhook HMAC-SHA256 verified. Slack Events API signature verified. No outbound webhook signing yet (webhooks not built). |

**Verdict**: Security fundamentals are solid (hashed keys, encrypted credentials, soft delete). Compliance gaps (CAN-SPAM unsubscribe, SOC 2) will matter for B2B SaaS customers.

---

## 9. Pricing & Self-Serve

| # | Requirement | Priority | Status | Notes |
|---|------------|----------|--------|-------|
| 9.1 | Free tier for evaluation | P0 | Gap | No tier system. All teams get unlimited access (soft quota only). |
| 9.2 | Usage-based pricing | P1 | Gap | Quota tracking exists but no billing integration. |
| 9.3 | Self-serve upgrade flow | P1 | Gap | No Stripe/payment integration. |
| 9.4 | White-label/custom domain | P2 | Planned (v1.1) | Custom sending domain verification (DNS DKIM/SPF) planned. |

**Verdict**: Pricing/billing is the largest product gap. Quota infrastructure exists but needs Stripe integration and tier enforcement to monetize.

---

## Overall Scorecard

| Category | Delivered | Partial | Planned | Gap | Score |
|----------|-----------|---------|---------|-----|-------|
| Core Delivery (9) | 6 | 0 | 3 | 0 | 67% |
| API & DX (10) | 7 | 1 | 0 | 2 | 75% |
| Workflow & Routing (9) | 6 | 0 | 1 | 2 | 67% |
| Subscriber Mgmt (7) | 4 | 1 | 0 | 2 | 64% |
| Observability (8) | 5 | 2 | 0 | 1 | 75% |
| Team & Access (6) | 3 | 1 | 0 | 2 | 58% |
| Reliability (7) | 5 | 1 | 0 | 1 | 79% |
| Compliance (8) | 4 | 2 | 0 | 2 | 63% |
| Pricing (4) | 0 | 0 | 1 | 3 | 0% |
| **Total (68)** | **40** | **8** | **5** | **15** | **65%** |

---

## Top 10 Gaps to Close (Prioritized for Startup Adoption)

| Rank | Gap | Impact | Effort |
|------|-----|--------|--------|
| 1 | **SMS channel** | Most startups need email + SMS + in-app as baseline | Medium |
| 2 | **Push notifications** | Mobile-first startups blocked without this | Medium |
| 3 | **Unsubscribe link generation** | CAN-SPAM/GDPR compliance risk | Low |
| 4 | **Outbound webhooks** | Enables custom integrations without polling | Medium |
| 5 | **Client SDKs (JS/Python/Go)** | Reduces integration time from hours to minutes | Medium |
| 6 | **Free tier + billing** | Can't monetize without pricing tiers | High |
| 7 | **Smart routing / fallback chains** | Key differentiator vs competitors | Medium |
| 8 | **Subscriber preference center UI** | Drop-in React component for end-user preferences | Low |
| 9 | **Delivery status webhooks** | Startups need callbacks for downstream logic | Medium |
| 10 | **Environments (dev/staging/prod)** | Teams need safe testing without affecting production | Low |

---

## Competitive Position

**alrt's strengths vs alternatives (Novu, Knock, Courier, OneSignal):**
- Zero external account setup (alrt-hosted for all channels)
- Visual workflow builder with conditions + delays
- Inline subscriber upsert (single API call to trigger)
- 6 channels on day 1 (most competitors start with 2-3)
- Dead letter queue with one-click retry
- Self-hostable (no vendor lock-in)

**alrt's weaknesses:**
- No SMS or push (table-stakes for many startups)
- No maintained SDKs (competitors ship SDKs in 5+ languages)
- No pricing/billing (can't self-serve purchase)
- No smart routing (competitors offer preference-based channel selection)
- No pre-built preference center UI component
