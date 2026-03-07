---
phase: 02-shared-sending-infrastructure
plan: "04"
subsystem: channels-api
tags: [slack, oauth, events-api, quota, alrt-hosted]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [channels-router, slack-alrt-hosted-oauth, slack-events-api, slack-quota]
  affects: [apps/api/alrt/routes/channels.py, apps/api/alrt/main.py, apps/workers/alrt_workers/tasks/channels/slack.py]
tech_stack:
  added: []
  patterns:
    - HMAC-SHA256 signature verification with replay attack protection (300s window)
    - Fernet-encrypted state for OAuth flow (team_id passed securely through Slack redirect)
    - UPSERT pattern for Slack provider (handles reconnect without duplicate rows)
    - alrt_hosted branch in Celery worker (gated decryption, graceful missing token handling)
    - Quota increment after Q_MARK_SENT (fire-and-forget, only fires on confirmed delivery)
key_files:
  created:
    - apps/api/alrt/routes/channels.py
  modified:
    - apps/api/alrt/main.py
    - apps/workers/alrt_workers/tasks/channels/slack.py
decisions:
  - Slack bot_token stored encrypted in alrt_hosted config (unlike email where api_key is injected from env at runtime — Slack token is per-workspace, must be persisted)
  - alrt_hosted Slack config uses same Fernet encryption as BYOC; only difference is graceful missing-token check
  - HMAC verification skipped when slack_signing_secret is empty string (dev mode)
  - Quota increment placed after Q_MARK_SENT (fire-and-forget) — DB hiccup does not undo sent status
metrics:
  duration_seconds: 89
  completed_date: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 2 Plan 04: Slack alrt_hosted OAuth + Events API + Worker Branch Summary

Channels router centralising alrt-hosted Slack OAuth flow with UPSERT reconnect support, Events API for token revocation, and gated alrt_hosted branch in Slack worker with quota tracking.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create routes/channels.py with Slack OAuth, Events API, and status endpoints | b2d39a1 | apps/api/alrt/routes/channels.py (created), apps/api/alrt/main.py (modified) |
| 2 | Add alrt_hosted branch to Slack worker and quota increment | 5aa0b80 | apps/workers/alrt_workers/tasks/channels/slack.py |

## What Was Built

**routes/channels.py** — New router at `/channels` prefix:

- `GET /channels` — Returns alrt_hosted channel status for the team (email + slack rows from providers table, filtered to `provider_type = 'alrt_hosted'`)
- `GET /channels/slack/connect?token=<jwt>` — Redirects to Slack OAuth, encodes team_id in Fernet-encrypted state param
- `GET /channels/slack/callback?code=<code>&state=<state>` — Exchanges OAuth code, upserts alrt_hosted provider (handles reconnect via `ON CONFLICT DO UPDATE`)
- `POST /channels/slack/events` — Handles `url_verification` challenge and `tokens_revoked` event (deactivates provider row matching Slack workspace_id)

**HMAC-SHA256 signature verification** — `_verify_slack_signature()` validates incoming Slack events. Skips verification if `slack_signing_secret` is empty (dev mode). Includes 300-second replay attack window.

**apps/api/alrt/main.py** — `channels` router imported alphabetically and registered after `auth` router.

**apps/workers/alrt_workers/tasks/channels/slack.py** — Three targeted changes:
1. Added `import os` for env var access
2. Replaced unconditional Fernet decrypt with `if provider["provider_type"] == "alrt_hosted":` branch — checks for missing `bot_token` and returns with warning if OAuth incomplete
3. Added quota upsert after `Q_MARK_SENT` (fire-and-forget, uses `MONTHLY_QUOTA_LIMIT` env var defaulting to 1000)

## Decisions Made

**1. Slack bot_token stored encrypted in alrt_hosted config**
Unlike the email alrt_hosted path (where `resend_api_key` is injected from env at runtime), the Slack bot_token is per-workspace and must be persisted. It's stored encrypted via Fernet inside the `config` JSONB column, same structure as BYOC.

**2. Graceful missing-token check only in alrt_hosted path**
BYOC path uses `config["bot_token"]` (raises KeyError if missing — signals misconfiguration). alrt_hosted path uses `config.get("bot_token")` with explicit `if not bot_token: return` — handles the case where OAuth placeholder exists but OAuth hasn't been completed.

**3. Dev mode signature skip**
If `SLACK_SIGNING_SECRET` env var is not set (empty string default), signature verification is skipped entirely. This allows local development without a Slack app configured.

**4. Quota placement after Q_MARK_SENT**
Quota increment is placed after `execute_update_query(Q_MARK_SENT, [nid])` so it only fires on confirmed successful delivery. A DB hiccup in the quota upsert does not roll back the sent status.

## Deviations from Plan

None — plan executed exactly as written.

## Pre-Deployment Actions Required (User)

These steps require manual configuration in the Slack App Dashboard:

1. Register `https://api.alrt.dev/channels/slack/events` as the Events API Request URL
   - Location: Slack App Dashboard -> Event Subscriptions -> Request URL
   - Slack will send a `url_verification` challenge — the code handles this automatically
2. Add `https://api.alrt.dev/channels/slack/callback` to OAuth Redirect URLs
   - Location: Slack App Dashboard -> OAuth & Permissions -> Redirect URLs
3. Set `SLACK_SIGNING_SECRET` env var in API environment
   - Source: Slack App Dashboard -> Basic Information -> App Credentials -> Signing Secret

## Self-Check: PASSED

- apps/api/alrt/routes/channels.py: FOUND
- apps/api/alrt/main.py: FOUND (channels imported and registered)
- apps/workers/alrt_workers/tasks/channels/slack.py: FOUND (alrt_hosted branch + quota)
- Commit b2d39a1: FOUND
- Commit 5aa0b80: FOUND
