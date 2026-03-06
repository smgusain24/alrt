# Roadmap: Alrt — Milestone 2

**Milestone:** Full-Stack Infrastructure
**Goal:** Shift from BYOC orchestrator to full-stack notifications infrastructure — one API key, alrt handles all sending
**Started:** 2026-02-28
**Requirements:** See REQUIREMENTS.md

---

## Phase 1: MVP Completion + Security

**Goal:** Finish the remaining 15% of MVP, fix critical security issues, and reach beta launch readiness.

**Requirements covered:** MVP-01, MVP-02, MVP-03, MVP-04, FIX-01

**Deliverables:**
- Activity feed page — real-time log of all notification events with delivery status per channel
- Analytics page — totals, per-channel breakdown, failure rates (7/30-day views)
- Team member invites — admin can invite by email; admin/viewer roles enforced
- Cookie security fix — httponly=True on JWT cookie, prevents XSS token theft
- Delay resume fix — FIX-01: subscriber_id/team_id preserved on delay node resume

**Success criteria:**
1. Dashboard shows live notification activity as events are triggered
2. Analytics page shows correct counts and failure rates for a team with 100+ notifications
3. Admin invites a team member; invitee logs in with own credentials and sees shared workspace
4. XSS cannot read JWT cookie (httponly verified via browser devtools)
5. Delayed notifications fire with correct subscriber context (preferences, DND honored on resume)

**Plans:** 6 plans

Plans:
- [ ] 01-01-PLAN.md — Cookie httponly fix (MVP-04) + delay resume bug fix (FIX-01)
- [ ] 01-02-PLAN.md — Activity feed API backend: GET /activity endpoint (MVP-01 backend)
- [ ] 01-03-PLAN.md — Activity feed dashboard page: Next.js page with filters, polling, channel badges (MVP-01 frontend)
- [ ] 01-04-PLAN.md — Analytics page redesign: stat cards + bar chart, 7-day default, failure rate in red (MVP-02)
- [ ] 01-05-PLAN.md — Team invites backend: team_invites table, invite API, accept-invite auth flow, members list (MVP-03 backend)
- [ ] 01-06-PLAN.md — Team invites frontend: members page, invite modal with copy-link, accept-invite page (MVP-03 frontend)

---

## Phase 2: Shared Sending Infrastructure

**Goal:** alrt owns the sending infrastructure for email and Slack. Startups no longer need their own SendGrid or Slack app accounts.

**Requirements covered:** INFRA-01, INFRA-02, INFRA-03

**Deliverables:**
- alrt shared email account (Resend) — all teams send email via alrt's Resend account by default
- alrt shared Slack app — teams connect their Slack workspace via alrt's registered OAuth app
- Per-team sending quotas — tracked in DB; soft limit with dashboard warning banner
- Provider model update — `alrt_hosted` provider type alongside existing BYOC
- Dashboard quota banner — generic warning shown across all pages when team exceeds 1,000/month
- New teams auto-provisioned — alrt_hosted email (active) + Slack placeholder (inactive) at signup

**Success criteria:**
1. New team can trigger email delivery without visiting SendGrid or entering any email credentials
2. New team can connect Slack workspace in one OAuth click without registering a Slack app
3. Team sending quota is tracked; over-limit team sees dashboard banner
4. Existing BYOC teams are unaffected after migration

**Plans:** 5/5 plans executed

Plans:
- [x] 02-01-PLAN.md — Schema foundation: team_quotas table + alrt_hosted SQL query constants (Wave 1)
- [x] 02-02-PLAN.md — Config + auth auto-insert: env vars, db.py schema management, signup provider provisioning (Wave 2)
- [x] 02-03-PLAN.md — Email worker: alrt_hosted branch uses RESEND_API_KEY, quota increment after send (Wave 2)
- [x] 02-04-PLAN.md — Slack channels route + worker: OAuth UPSERT, tokens_revoked events, alrt_hosted branch (Wave 3)
- [x] 02-05-PLAN.md — Quota visibility: GET /teams/{id}/quota API + dashboard warning banner (Wave 3)

---

## Phase 3: Platform Hardening + API Reliability

**Goal:** Make the platform production-ready before adding new channels. Fix reliability gaps, fill the API surface with features every production notification system needs, and establish the template + preferences model that all current and future channels will inherit.

**Why before WhatsApp:** Templates, subscriber preferences API, DLQ, and bulk trigger are channel-agnostic infrastructure. Building them now means WhatsApp (and every channel after it) benefits automatically. Building WhatsApp first means backporting these onto a fragile base.

**Requirements covered:** TRIG-01 ✅, TRIG-02 ✅, TRIG-03 ✅, TRIG-04 ✅, FIX-02 ✅, FIX-03 ✅, COND-01 ✅, COND-02 ✅, WF-01 ✅, RETRY-01 ✅, SCALE-01 ✅, PREF-01 ✅, TMPL-01 ✅, DATA-01 ✅

**Deliverables:**
- ✅ Inline subscriber upsert on trigger (TRIG-01) — `subscriber` object auto-creates/updates subscriber; no pre-registration required
- ✅ `deliver_at` scheduling on trigger (TRIG-02) — schedule execution for future datetime without a delay workflow node; Beat poller picks up due executions atomically
- ✅ `metadata` tagging on trigger (TRIG-03) — arbitrary key-value dict attached to execution, filterable in activity feed and analytics
- ✅ `POST /events/trigger-bulk` (TRIG-04) — trigger same workflow for up to 1000 inline subscribers in one call; returns batch_id + per-subscriber status; supersedes BULK-01
- ✅ Idempotency atomic fix (FIX-03) — Redis SET NX replaces GET-then-SET; eliminates race condition on concurrent trigger requests with same key
- ✅ Redis connection cleanup (FIX-02) — try/finally ensures connection close in events.py; no leak under load
- ✅ Expanded condition operators (COND-01, COND-02) — `greater_than`, `less_than`, `between` (numeric); `contains`, `starts_with`, `regex` (string)
- ✅ Workflow graph validation (WF-01) — reject cycles (DFS), dangling edges, missing trigger node on save/publish
- ✅ Dead letter queue (RETRY-01) — notifications that exhaust all retries stored in DLQ; dashboard shows permanently failed list with one-click retry
- ✅ Channel-specific Celery queues (SCALE-01) — email/slack/inapp delivery tasks routed to dedicated queues; surge in one channel cannot delay others
- ✅ Subscriber preferences endpoint (PREF-01) — `GET /subscribers/:id/preferences` + `PUT /subscribers/:id/preferences`; accessible with client key (`alrt_ck_`)
- ✅ Template management API (TMPL-01) — templates as first-class resources; create/update/preview independently of workflows; channel nodes reference a template ID
- ✅ Notification log retention (DATA-01) — archival policy for notifications older than 90 days; covering indexes for active-window queries

**Success criteria:**
1. ✅ Trigger with a new `subscriber.id` → subscriber auto-created; re-trigger with updated email → email updated, not duplicated (TRIG-01)
2. ✅ Trigger with `deliver_at` 60s in future → execution status = `scheduled`; after delay + Beat poll → notification delivered (TRIG-02)
3. ✅ Trigger with `metadata: { "campaign": "q1" }` → execution row stores metadata; activity feed returns it (TRIG-03)
4. ✅ `POST /events/trigger-bulk` with 500 inline subscribers enqueues 500 workflow executions; all complete successfully (TRIG-04)
5. ✅ Condition node with `amount > 100` (greater_than) correctly branches workflow for numeric payload fields
6. ✅ Publishing a workflow with a cycle returns 422 with a clear validation error
7. ✅ A notification exhausting all retries appears in the DLQ; one-click retry re-enqueues and delivers successfully
8. ✅ 1000 concurrent email deliveries do not delay in-app notifications for other teams (queue isolation verified)
9. ✅ Two concurrent trigger requests with the same idempotency key result in exactly one workflow execution (FIX-03)
10. ✅ `GET /subscribers/:id/preferences` returns per-channel opts + frequency caps; PUT updates and the next delivery honors the change
11. ✅ Template created via API renders correctly when referenced by a workflow channel node
12. ✅ Redis connection count stays stable under sustained load (no leak) (FIX-02)

**Plans:** Batch 1 (COND-01, COND-02, WF-01, RETRY-01, SCALE-01) and Batch 2 (PREF-01, TMPL-01, DATA-01) complete. All 14 requirements delivered.

---

## Phase 4: New Channels — WhatsApp, Discord, Telegram

**Goal:** Expand from 3 channels to 6. Add WhatsApp (Meta Cloud API), Discord (webhooks), and Telegram (Bot API) as delivery channels. All three use alrt-hosted credentials by default — zero setup for startups.

**Requirements covered:** WA-01, WA-02, WA-03, WA-04, DC-01, DC-02, DC-03, TG-01, TG-02, TG-03

**Deliverables:**

*Shared (all three channels):*
- `VALID_CHANNELS` and `ChannelType` updated to include `whatsapp`, `discord`, `telegram`
- `step_runner.py` dispatch extended for all three channel types
- `celery_app.py` queue routing for `whatsapp_queue`, `discord_queue`, `telegram_queue`
- Dashboard workflow builder channel node supports all three new channels
- Dashboard providers page updated with icons/config for all three
- Activity page channel badges updated

*WhatsApp:*
- ✅ `phone_number` field added to subscriber model and DB schema (done in Phase 3 trigger work)
- `whatsapp` channel type in workflow builder (channel node)
- WhatsApp template editor in config panel (message body with `{{variable}}` support); references template management API from Phase 3
- Celery task `channels/whatsapp.deliver` — sends via alrt's WABA (Meta Cloud API); routes through dedicated `whatsapp_queue`
- Delivery status tracking — sent/delivered/read/failed in notifications table; webhook callback from Meta updates status

*Discord:*
- Subscriber model supports `discord_webhook_url` field (per-subscriber or per-team webhook)
- Celery task `channels/discord.deliver` — sends via Discord webhook API; supports embeds with title/body/color
- Discord message config in workflow builder channel node (message body, embed toggle)

*Telegram:*
- Subscriber model supports `telegram_chat_id` field
- Celery task `channels/telegram.deliver` — sends via Telegram Bot API (`sendMessage`); supports Markdown formatting
- Telegram message config in workflow builder channel node (message body, parse mode)
- alrt-hosted Telegram bot (single bot token in env, shared across teams)

**Success criteria:**
1. Developer adds `phone_number` to a subscriber and triggers a workflow — WhatsApp message delivered
2. WhatsApp delivery status (delivered/read) updates in notifications table after provider callback
3. WhatsApp template with `{{variable}}` renders subscriber-specific content
4. Failed WhatsApp delivery (invalid number) marks notification as `failed` with error reason; appears in DLQ
5. Developer sets `discord_webhook_url` on subscriber and triggers workflow — Discord embed message delivered to channel
6. Developer sets `telegram_chat_id` on subscriber and triggers workflow — Telegram message delivered via bot
7. All three new channels appear in workflow builder channel node dropdown and work end-to-end

**Plans:** 3/4 plans executed

Plans:
- [x] 04-01-PLAN.md — Backend foundation: schema extensions, config, subscriber model, step_runner dispatch, Celery routing (Wave 1)
- [ ] 04-02-PLAN.md — Discord webhook + Telegram Bot API delivery workers (Wave 2)
- [ ] 04-03-PLAN.md — WhatsApp Meta Cloud API worker + webhook endpoint for delivery status (Wave 2)
- [ ] 04-04-PLAN.md — Dashboard: workflow builder 6-channel support + provider settings page redesign (Wave 2)

---

## Phase 5: White-Label & Pricing Tiers

**Goal:** Implement pricing tiers tied to white-label depth. Verified domain → emails from client's domain. BYOC WABA → WhatsApp from client's number.

**Requirements covered:** WL-01, WL-02, WL-03, WL-04

**Deliverables:**
- `teams` table gets `tier` column (free/starter/pro/business)
- Email domain verification flow — team enters sending domain; alrt provides DNS records (DKIM/SPF); verification polling; once verified, emails route through client's domain via alrt's Resend account
- BYOC WABA — Pro+ teams can enter their own Meta WABA credentials; WhatsApp routes through their number
- Tier enforcement — middleware checks tier before allowing white-label features; 402 with upgrade prompt otherwise
- Dashboard — settings page shows tier, white-label status, domain verification UI

**Success criteria:**
1. Pro team verifies domain `notifications.theirclient.com` → emails show `From: noreply@theirclient.com`
2. Free team attempting domain verification gets a clear upgrade prompt
3. Business team enters WABA credentials → WhatsApp delivers from their registered number
4. Tier downgrade correctly disables white-label features and reverts to alrt domains

---

## Milestone Summary

| Phase | Goal | Status | Key Output |
|-------|------|--------|------------|
| 1 | MVP Completion + Security | Pending | Beta-ready product, secure auth, fixed bugs |
| 2 | Shared Sending Infrastructure | ✅ Complete | alrt-hosted email + Slack, quota tracking, dashboard banner |
| 3 | Platform Hardening + API Reliability | ✅ Complete | TRIG-01–04, FIX-02, FIX-03 done; COND-01, COND-02, WF-01, RETRY-01, SCALE-01 done (Batch 1); PREF-01, TMPL-01, DATA-01 done (Batch 2) — all 14 requirements delivered |
| 4 | 3/4 | In Progress|  |
| 5 | White-Label & Pricing | Pending | Revenue model enforced; domain verification; BYOC WABA |

**After this milestone:** alrt is the full-stack notification infrastructure it was designed to be. One API key, 6 channels (in-app, email, Slack, WhatsApp, Discord, Telegram), zero external account setup, production-grade reliability, white-label for paying customers.

---
*Roadmap created: 2026-02-28*
*Updated: 2026-03-01 — Phase 3/5 swapped (Platform Hardening before WhatsApp); added RETRY-01, SCALE-01, FIX-03, PREF-01, TMPL-01, DATA-01 from infrastructure gap analysis; added TRIG-01 through TRIG-04 (inline subscriber upsert, deliver_at scheduling, metadata tagging, bulk trigger); BULK-01 superseded by TRIG-04; TRIG-01–04 + FIX-02 + FIX-03 implemented and marked complete*
*Updated: 2026-03-06 — Phase 3 Batch 2 complete: PREF-01 (preferences typed response), TMPL-01 (templates CRUD + worker resolution), DATA-01 (retention task + Beat schedule + covering index)*
*Updated: 2026-03-06 — Phase 4 Plan 01 complete: backend foundation for 3 new channels — VALID_CHANNELS expanded to 6, subscriber model extended, step_runner dispatch wired, Celery routing ready*
*Strategy: .claude/VISION.md*
*Requirements: .planning/REQUIREMENTS.md*
