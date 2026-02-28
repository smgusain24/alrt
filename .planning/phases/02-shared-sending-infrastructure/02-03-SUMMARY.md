---
phase: 02-shared-sending-infrastructure
plan: "03"
subsystem: infra
tags: [celery, resend, email, quota, alrt_hosted]

# Dependency graph
requires:
  - phase: 02-shared-sending-infrastructure
    provides: "02-01 created team_quotas table and alrt_hosted provider rows inserted at signup; 02-02 added resend_api_key + monthly_quota_limit to config"
provides:
  - "alrt_hosted email delivery path: new teams can send email via alrt's shared Resend account without per-team credentials"
  - "Monthly quota counter atomically incremented after every successful email send"
  - "BYOC email path (sendgrid/resend with encrypted config) unchanged"
affects: [02-04, 02-05, 03-whatsapp-channel, 04-white-label-pricing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "alrt_hosted branch before fernet decrypt — provider_type check gates encrypted config access"
    - "Quota upsert fire-and-forget — runs after Q_MARK_SENT inside try block, not wrapped in its own try/except so DB hiccup does not undo sent status"
    - "RESEND_API_KEY injected into config dict at runtime — alrt_hosted config never stores secrets"
    - "MONTHLY_QUOTA_LIMIT env var fallback to 1000 — workers do not import from alrt.config"

key-files:
  created: []
  modified:
    - apps/workers/alrt_workers/tasks/channels/email.py

key-decisions:
  - "alrt_hosted config dict stores display_name only — api_key injected from env var at task execution time, never persisted"
  - "MONTHLY_QUOTA_LIMIT read via os.getenv in worker with 1000 default — matches config.py default, avoids cross-app import"
  - "Quota increment placed after Q_MARK_SENT (not before) — only fires on successful delivery, fire-and-forget semantics"
  - "display_name sanitized: angle brackets stripped, capped at 64 chars — prevents email header injection"
  - "alrt_hosted _send_email branch uses timeout=15 — explicit timeout absent from existing sendgrid/resend BYOC branches"

patterns-established:
  - "Provider type branching pattern: if alrt_hosted → env config; else → fernet decrypt. Use this for Slack worker (02-04)"
  - "Quota upsert SQL inline in worker file — workers do not import from alrt.queries"

requirements-completed: [INFRA-01, INFRA-03]

# Metrics
duration: 1min
completed: "2026-02-28"
---

# Phase 2 Plan 03: Hosted Email Delivery Summary

**alrt_hosted email path via shared Resend account — new teams send email without credentials, with atomic monthly quota tracking**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-28T08:13:48Z
- **Completed:** 2026-02-28T08:14:37Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Email worker branches on `provider_type == "alrt_hosted"` and uses `RESEND_API_KEY` env var instead of decrypting per-team config
- `_send_email()` handles `alrt_hosted` with sanitized from-address (`{display_name} <noreply@alrt.dev>`)
- Monthly quota counter atomically upserted in `team_quotas` after every successful email delivery (fire-and-forget)
- BYOC path (fernet decrypt for sendgrid/resend) moved inside `else` branch — entirely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add alrt_hosted branch to email worker and quota increment** - `b0a91a9` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/workers/alrt_workers/tasks/channels/email.py` - alrt_hosted branch in deliver(), alrt_hosted case in _send_email(), quota upsert after Q_MARK_SENT, import os added

## Decisions Made

- `alrt_hosted` config dict stores `display_name` only — `api_key` injected from `RESEND_API_KEY` env var at task execution time, never persisted to DB
- `MONTHLY_QUOTA_LIMIT` read via `os.getenv` in the worker with a default of 1000, avoiding a cross-app import from `alrt.config`
- Quota increment placed after `Q_MARK_SENT` (not before) — only fires on confirmed successful delivery; fire-and-forget: no wrapping try/except so a DB hiccup does not undo the sent status
- `display_name` sanitized by stripping angle brackets and capping at 64 chars to prevent email header injection
- `alrt_hosted` `_send_email` branch sets `timeout=15` on the httpx POST — explicit timeout absent from existing BYOC branches (pre-existing gap, not in scope to fix here)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before alrt_hosted email delivery works in production:**

- `RESEND_API_KEY` env var must be set in the Celery workers environment (Resend Dashboard -> API Keys -> Create API Key)
- `alrt.dev` domain must be verified in Resend Dashboard with SPF + DKIM DNS records (Resend Dashboard -> Domains -> Add Domain -> copy DNS records -> add to DNS provider). Email sends will return HTTP 422 until this is done.

These are pre-deployment steps; no code changes are required.

## Next Phase Readiness

- Email delivery is ready for `alrt_hosted` teams — depends on `RESEND_API_KEY` env var and `alrt.dev` domain verification
- Quota counter is live — `GET /quota` status endpoint (planned in a later plan) will have data to return
- Plan 02-04 (Slack alrt_hosted) can follow the same provider_type branching pattern established here

---
*Phase: 02-shared-sending-infrastructure*
*Completed: 2026-02-28*
