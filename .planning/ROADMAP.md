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

## Phase 3: WhatsApp Channel

**Goal:** Add WhatsApp as a delivery channel using alrt's WABA. Zero WABA setup required for startups on default tier.

**Requirements covered:** WA-01, WA-02, WA-03, WA-04

**Deliverables:**
- `phone_number` field added to subscriber model
- `whatsapp` channel type in workflow builder (channel node)
- WhatsApp template editor in config panel (message body with `{{variable}}` support)
- Celery task `channels/whatsapp.deliver` — sends via alrt's WABA (Meta Cloud API)
- Delivery status tracking — sent/delivered/read/failed in notifications table
- Dashboard channel badges updated to show WhatsApp
- Worker step_runner updated to route `whatsapp` channel type

**Success criteria:**
1. Developer adds `phone_number` to a subscriber and triggers a workflow — WhatsApp message delivered
2. WhatsApp delivery status (delivered/read) updates in notifications table after provider callback
3. WhatsApp template with `{{variable}}` renders subscriber-specific content
4. Failed WhatsApp delivery (invalid number) marks notification as `failed` with error reason

---

## Phase 4: White-Label & Pricing Tiers

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

## Phase 5: Platform Hardening

**Goal:** Fill the gaps that limit B2B SaaS + e-commerce + DevOps use cases: bulk sends, advanced conditions, workflow validation, performance fixes.

**Requirements covered:** BULK-01, COND-01, COND-02, WF-01, FIX-02

**Deliverables:**
- `POST /events/trigger-bulk` — accepts array of subscriber IDs (up to 1000); enqueues individual workflow tasks per subscriber; returns batch execution ID
- Expanded condition operators — `greater_than`, `less_than`, `between` (numeric); `contains`, `starts_with`, `regex` (string)
- Workflow graph validation — on save and publish: reject cycles (DFS), reject dangling edges, require trigger node
- Redis connection cleanup — replace raw connection opens with `async with` context managers in events.py
- Dashboard — bulk trigger shown in API docs; condition builder UI updated with new operators

**Success criteria:**
1. `POST /events/trigger-bulk` with 500 subscriber IDs enqueues 500 workflow executions; all complete successfully
2. Condition node with `amount > 100` (greater_than) correctly branches workflow for numeric payload fields
3. Publishing a workflow with a cycle returns 422 with a clear validation error
4. Redis connection count stays stable under sustained load (no leak)

---

## Milestone Summary

| Phase | Goal | Key Output |
|-------|------|------------|
| 1 | MVP Completion + Security | Beta-ready product, secure auth, fixed bugs |
| 2 | Shared Sending Infrastructure | 5/5 Complete | alrt-hosted email + Slack, quota tracking, dashboard banner |
| 3 | WhatsApp Channel | Pending | 4th delivery channel live |
| 4 | White-Label & Pricing | Revenue model enforced; domain verification |
| 5 | Platform Hardening | Bulk sends, advanced conditions, validated workflows |

**After this milestone:** alrt is the full-stack notification infrastructure it was designed to be. One API key, 4 channels (in-app, email, Slack, WhatsApp), zero external account setup, white-label for paying customers.

---
*Roadmap created: 2026-02-28*
*Strategy: .claude/VISION.md*
*Requirements: .planning/REQUIREMENTS.md*
