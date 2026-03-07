---
phase: 02-shared-sending-infrastructure
verified: 2026-02-28T09:00:00Z
status: passed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "Trigger email delivery for a new team (alrt_hosted path)"
    expected: "Email arrives from noreply@alrt.dev with team name as display name, no credentials configured by the team"
    why_human: "Requires RESEND_API_KEY + alrt.dev domain verification in Resend; cannot verify end-to-end send without live credentials"
  - test: "Connect Slack workspace via /channels/slack/connect OAuth flow"
    expected: "Team redirected to Slack authorization, callback stores bot_token, GET /channels returns is_active=true for slack channel"
    why_human: "Requires live SLACK_CLIENT_ID/SECRET, a real Slack app registration, and a browser-based OAuth redirect flow"
  - test: "Quota warning banner renders in dashboard when over_limit=true"
    expected: "Yellow banner 'You've exceeded your monthly notification limit. Contact support to continue sending.' appears across all dashboard pages"
    why_human: "Requires running dashboard dev server and simulating over_limit state in database"
---

# Phase 2: Shared Sending Infrastructure Verification Report

**Phase Goal:** alrt owns the sending infrastructure for email and Slack. Startups no longer need their own SendGrid or Slack app accounts.
**Verified:** 2026-02-28T09:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `team_quotas` table exists in schema.sql with `UNIQUE(team_id, period_start)` for upsert support | VERIFIED | `schema.sql` lines 152-166: CREATE TABLE IF NOT EXISTS team_quotas with UNIQUE constraint and both indexes |
| 2 | Quota upsert query atomically increments monthly_count and sets over_limit flag in one SQL statement | VERIFIED | `queries/quotas.py` lines 4-11: UPSERT_QUOTA with `ON CONFLICT (team_id, period_start) DO UPDATE` |
| 3 | Query helpers exist for inserting alrt_hosted email and slack providers at team creation | VERIFIED | `queries/providers.py` lines 32-43: CREATE_ALRT_HOSTED_EMAIL and CREATE_ALRT_HOSTED_SLACK present |
| 4 | New teams automatically get an active alrt_hosted email provider and inactive Slack placeholder at signup | VERIFIED | `routes/auth.py` lines 55-60: both provider inserts after user creation, before JWT generation |
| 5 | RESEND_API_KEY, SLACK_SIGNING_SECRET, MONTHLY_QUOTA_LIMIT are configurable env vars in Settings | VERIFIED | `config.py` lines 16-18: all three fields present with correct defaults |
| 6 | team_quotas table is bootstrapped by db.py's schema management at API startup | VERIFIED | `db.py` line 38: "team_quotas" in REQUIRED_TABLES; line 59: idx_team_quotas_team_period in REQUIRED_INDEXES; line 198: DDL in SCHEMA_SQL |
| 7 | Email delivery works for alrt_hosted teams without per-team credentials | VERIFIED | `email.py` lines 47-57: alrt_hosted branch injects RESEND_API_KEY from env, gates on missing key |
| 8 | From-address uses team's display_name from provider config (e.g. 'Acme Inc <noreply@alrt.dev>') | VERIFIED | `email.py` lines 128-133: sanitized display_name with angle bracket stripping, formatted as `{name} <noreply@alrt.dev>` |
| 9 | Monthly quota is incremented atomically after each successful email delivery | VERIFIED | `email.py` lines 95-105: ON CONFLICT upsert SQL after Q_MARK_SENT inside try block |
| 10 | Teams can connect Slack workspace via alrt's OAuth app — no Slack app registration required | VERIFIED | `routes/channels.py` lines 72-98: GET /channels/slack/connect redirects to slack.com OAuth with alrt's client_id |
| 11 | OAuth callback upserts the alrt_hosted Slack provider row (handles reconnect case) | VERIFIED | `routes/channels.py` lines 141-143: execute_insert_query(prov_q.UPSERT_SLACK_ALRT_HOSTED, ...) with ON CONFLICT DO UPDATE |
| 12 | When Slack sends tokens_revoked event, the team's Slack provider is marked inactive | VERIFIED | `routes/channels.py` lines 164-173: tokens_revoked event handler calls DEACTIVATE_SLACK_BY_WORKSPACE |
| 13 | Slack worker uses bot_token from alrt_hosted provider config instead of BYOC credentials | VERIFIED | `slack.py` lines 57-70: alrt_hosted branch decrypts bot_token; graceful missing-token check before delivery |
| 14 | Dashboard shows a warning banner when a team has exceeded their monthly notification quota | VERIFIED | `layout.tsx` lines 172/183-192/200-204: quotaExceeded state, useEffect fetches api.teams.getQuota, conditional banner renders |

**Score:** 14/14 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `schema.sql` | team_quotas DDL + unique indexes | VERIFIED | Lines 152-166: CREATE TABLE team_quotas with UNIQUE(team_id, period_start), idx_team_quotas_team_period, idx_providers_team_channel_type |
| `apps/api/alrt/queries/quotas.py` | UPSERT_QUOTA, GET_QUOTA_STATUS | VERIFIED | 21-line file, both constants present and substantive |
| `apps/api/alrt/queries/providers.py` | 5 alrt_hosted constants appended | VERIFIED | Lines 28-81: CREATE_ALRT_HOSTED_EMAIL, CREATE_ALRT_HOSTED_SLACK, UPSERT_SLACK_ALRT_HOSTED, DEACTIVATE_SLACK_BY_WORKSPACE, GET_CHANNELS_STATUS all present |
| `apps/api/alrt/config.py` | resend_api_key, slack_signing_secret, monthly_quota_limit fields | VERIFIED | Lines 16-18: all three fields with correct env var mappings and defaults |
| `apps/api/alrt/db.py` | team_quotas in schema management | VERIFIED | REQUIRED_TABLES, REQUIRED_INDEXES, SCHEMA_SQL all include team_quotas |
| `apps/api/alrt/routes/auth.py` | alrt_hosted provider inserts at signup | VERIFIED | Lines 55-60: prov_q imported, both CREATE_ALRT_HOSTED_EMAIL and CREATE_ALRT_HOSTED_SLACK called after user creation |
| `apps/workers/alrt_workers/tasks/channels/email.py` | alrt_hosted branch + quota increment | VERIFIED | Lines 47-57: alrt_hosted config branch; lines 95-105: quota upsert after Q_MARK_SENT; lines 128-155: alrt_hosted in _send_email() |
| `apps/api/alrt/routes/channels.py` | Slack OAuth, Events API, channels status endpoints | VERIFIED | Full implementation: GET /channels, GET /channels/slack/connect, GET /channels/slack/callback, POST /channels/slack/events |
| `apps/api/alrt/main.py` | channels router registered | VERIFIED | Line 12: channels in import; line 41: app.include_router(channels.router) |
| `apps/workers/alrt_workers/tasks/channels/slack.py` | alrt_hosted branch + quota increment | VERIFIED | Lines 57-70: alrt_hosted branch with graceful bot_token check; lines 96-106: quota upsert after Q_MARK_SENT |
| `apps/api/alrt/routes/teams.py` | GET /teams/{team_id}/quota endpoint | VERIFIED | Lines 103-118: endpoint using quotas_q.GET_QUOTA_STATUS, safe defaults when no row, 403 team ownership check |
| `apps/dashboard/src/lib/api.ts` | api.teams.getQuota() method | VERIFIED | Lines 97-100: teams.getQuota typed method returning { over_limit: boolean; monthly_count: number } |
| `apps/dashboard/src/app/(dashboard)/layout.tsx` | Quota warning banner in dashboard layout | VERIFIED | Lines 172/183-192/200-204: quotaExceeded state, second useEffect, conditional banner with correct copy |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `queries/quotas.py` | team_quotas table | `ON CONFLICT(team_id, period_start) DO UPDATE` | WIRED | UPSERT_QUOTA line 7 contains exact conflict clause |
| `queries/providers.py` | providers table | INSERT for alrt_hosted channel rows | WIRED | CREATE_ALRT_HOSTED_EMAIL/SLACK lines 32-44 target providers table |
| `routes/auth.py` | `queries/providers.py` | `execute_insert_query(prov_q.CREATE_ALRT_HOSTED_EMAIL, ...)` | WIRED | Lines 55-60: both provider inserts present; prov_q imported on line 10 |
| `db.py` | team_quotas table | REQUIRED_TABLES + SCHEMA_SQL | WIRED | All three schema management locations updated |
| `email.py` | RESEND_API_KEY env var | `os.getenv('RESEND_API_KEY')` in alrt_hosted branch | WIRED | Line 50: config["api_key"] = os.getenv("RESEND_API_KEY", "") |
| `email.py` | team_quotas table | UPSERT_QUOTA SQL after Q_MARK_SENT | WIRED | Lines 95-105: inline SQL with ON CONFLICT upsert |
| `routes/channels.py` | `queries/providers.py` | `UPSERT_SLACK_ALRT_HOSTED` after OAuth code exchange | WIRED | Line 141: execute_insert_query(prov_q.UPSERT_SLACK_ALRT_HOSTED, ...) |
| `routes/channels.py` | `queries/providers.py` | `DEACTIVATE_SLACK_BY_WORKSPACE` on tokens_revoked | WIRED | Lines 170-173: execute_update_query(prov_q.DEACTIVATE_SLACK_BY_WORKSPACE, ...) |
| `slack.py` | team_quotas table | quota upsert after successful chat.postMessage | WIRED | Lines 96-106: inline SQL with ON CONFLICT upsert |
| `routes/teams.py` | team_quotas table | `execute_read_one_query(quotas_q.GET_QUOTA_STATUS, ...)` | WIRED | Line 114: direct query call; quotas_q imported on line 11 |
| `layout.tsx` | `/teams/{team_id}/quota API` | `api.teams.getQuota(teamId)` in useEffect | WIRED | Lines 187-191: getQuota called in second useEffect dependent on user.team_id |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-01 | 02-01, 02-02, 02-03 | Startup can trigger email delivery without providing their own SendGrid/Resend credentials | SATISFIED | alrt_hosted email provider auto-created at signup (auth.py); email worker branches on alrt_hosted, uses RESEND_API_KEY from env (email.py); noreply@alrt.dev from-address |
| INFRA-02 | 02-01, 02-02, 02-04 | Startup can connect Slack workspace via alrt's OAuth app without registering their own Slack app | SATISFIED | channels.py: GET /channels/slack/connect redirects to alrt's OAuth; callback stores encrypted bot_token via UPSERT; tokens_revoked event deactivates provider |
| INFRA-03 | 02-01, 02-02, 02-03, 02-04, 02-05 | Each team's sending is quota-tracked to prevent abuse of shared infrastructure | SATISFIED | team_quotas table (schema.sql + db.py); atomic upsert in both email and slack workers after successful delivery; GET /teams/{team_id}/quota endpoint (teams.py); dashboard warning banner (layout.tsx) |

All three requirement IDs declared in plan frontmatter are SATISFIED. No orphaned requirements found — REQUIREMENTS.md maps only INFRA-01, INFRA-02, INFRA-03 to Phase 2.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | No anti-patterns found across all phase 2 artifacts |

Scanned: channels.py, email.py, slack.py, teams.py, auth.py, config.py, providers.py, quotas.py, layout.tsx, api.ts for TODO/FIXME/stub returns/placeholder comments. All files are substantive implementations.

---

### Human Verification Required

#### 1. End-to-End Email Delivery (alrt_hosted)

**Test:** Sign up a new team, trigger an event that routes to email channel, check recipient inbox
**Expected:** Email arrives from `{team_name} <noreply@alrt.dev>` — no SendGrid or Resend credentials configured on the team's side
**Why human:** Requires RESEND_API_KEY populated in workers environment, and alrt.dev domain verified in Resend Dashboard with SPF + DKIM DNS records. Cannot simulate end-to-end without live credentials.

#### 2. Slack OAuth Connection Flow

**Test:** Log in to dashboard, navigate to /settings/providers, click "Connect Slack" (via /channels/slack/connect?token=...), complete OAuth in Slack
**Expected:** Redirected to Slack app authorization page showing alrt's app name; after approval, redirected to dashboard; GET /channels returns `{"channel": "slack", "is_active": true, "workspace_name": "..."}`
**Why human:** Requires live SLACK_CLIENT_ID + SLACK_CLIENT_SECRET, a Slack app with redirect URL registered, and a browser to complete the OAuth redirect chain.

#### 3. Quota Warning Banner Display

**Test:** Insert an over_limit row: `INSERT INTO team_quotas (team_id, period_start, monthly_count, over_limit) VALUES ('<team_uuid>', date_trunc('month', now()), 1001, true) ON CONFLICT (team_id, period_start) DO UPDATE SET over_limit = true;` — then refresh dashboard
**Expected:** Yellow banner "You've exceeded your monthly notification limit. Contact support to continue sending." appears across all dashboard pages (workflows, subscribers, analytics, settings). Banner text contains no usage number.
**Why human:** Requires running Next.js dev server + database access to simulate quota state. Visual rendering cannot be verified programmatically.

---

### Summary

Phase 2 goal is fully achieved in the codebase. All 14 observable truths are verified across 13 artifact files, all key links are wired, and all three requirements (INFRA-01, INFRA-02, INFRA-03) are satisfied.

**What was built:**
- Data layer: `team_quotas` table with atomic upsert; 5 alrt_hosted provider query constants; unique index enabling ON CONFLICT upserts (Plans 02-01)
- API startup: env vars for shared infrastructure; schema auto-creation; alrt_hosted providers provisioned at every team signup (Plan 02-02)
- Email infrastructure: Worker branches on `provider_type == "alrt_hosted"`, injects RESEND_API_KEY from env, uses sanitized `noreply@alrt.dev` from-address; quota counted per delivery (Plan 02-03)
- Slack infrastructure: New channels router with OAuth connect/callback (UPSERT for reconnect), Events API for token revocation; Slack worker branches on alrt_hosted with graceful OAuth-incomplete handling; quota counted per delivery (Plan 02-04)
- Quota visibility: GET /teams/{team_id}/quota endpoint; api.ts typed method; dashboard layout sticky warning banner when over_limit=true (Plan 02-05)

Three items requiring human verification are operational concerns (live API keys, domain verification, browser OAuth) rather than code defects. The codebase implementation is complete.

---

_Verified: 2026-02-28T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
