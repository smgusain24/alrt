---
phase: 02-shared-sending-infrastructure
plan: "01"
subsystem: database
tags: [postgres, sql, asyncpg, quotas, providers, alrt_hosted]

# Dependency graph
requires: []
provides:
  - team_quotas table with UNIQUE(team_id, period_start) and period-based monthly tracking
  - UPSERT_QUOTA atomic ON CONFLICT upsert query for monthly delivery counting
  - GET_QUOTA_STATUS query for current-month quota check
  - CREATE_ALRT_HOSTED_EMAIL query for team signup provider provisioning
  - CREATE_ALRT_HOSTED_SLACK query for team signup Slack placeholder provisioning
  - UPSERT_SLACK_ALRT_HOSTED query for OAuth completion upsert
  - DEACTIVATE_SLACK_BY_WORKSPACE query for token revocation handling
  - GET_CHANNELS_STATUS query for dashboard channels display
  - idx_providers_team_channel_type unique index enabling ON CONFLICT upsert
affects:
  - 02-02 (API routes for channels/quota that use these queries)
  - 02-03 (Celery workers that call UPSERT_QUOTA on delivery)
  - 02-04 (OAuth flow that calls UPSERT_SLACK_ALRT_HOSTED)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ON CONFLICT (team_id, period_start) DO UPDATE for atomic monthly quota increment — no cron reset needed"
    - "period_start = date_trunc('month', now()) at query time creates new row per month automatically"
    - "alrt_hosted provider rows created at team signup; Slack placeholder inactive until OAuth"
    - "Unique index on (team_id, channel, provider_type) enables safe ON CONFLICT upsert for providers"

key-files:
  created:
    - apps/api/alrt/queries/quotas.py
  modified:
    - schema.sql
    - apps/api/alrt/queries/providers.py

key-decisions:
  - "No created_at on team_quotas — period_start is the row identity timestamp, avoiding redundancy"
  - "Quota increment uses (team_quotas.monthly_count + 1) > $2 post-increment comparison so over_limit reflects the current delivery, not the previous state"
  - "BYOC providers unaffected by idx_providers_team_channel_type — they use different provider_type values (resend, sendgrid, slack_oauth)"
  - "Slack alrt_hosted placeholder inserted as inactive at signup — activated only after OAuth callback"

patterns-established:
  - "Query-time period calculation: date_trunc('month', now()) avoids scheduled resets"
  - "SQL constants as module-level strings in queries/*.py — no ORM, no query builders"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 2 Plan 01: DB Schema + Query Layer for Shared Sending Infrastructure Summary

**team_quotas table with atomic ON CONFLICT upsert + 7 alrt_hosted provider query constants establishing the data layer foundation for Phase 2 email/Slack infrastructure**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-28T08:06:41Z
- **Completed:** 2026-02-28T08:07:42Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added team_quotas table to schema.sql with UNIQUE(team_id, period_start) constraint enabling atomic ON CONFLICT upsert — no cron job needed to reset monthly counts
- Created apps/api/alrt/queries/quotas.py with UPSERT_QUOTA (atomic monthly counter + over_limit flag) and GET_QUOTA_STATUS
- Extended apps/api/alrt/queries/providers.py with 5 alrt_hosted constants (email/slack signup provisioning, OAuth upsert, workspace deactivation, channels status display)
- Added idx_providers_team_channel_type unique index to schema.sql enabling the UPSERT_SLACK_ALRT_HOSTED ON CONFLICT clause without affecting BYOC provider rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Add team_quotas table to schema.sql** - `65c8223` (feat)
2. **Task 2: Create quotas.py and extend providers.py with alrt_hosted queries** - `f258d34` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `schema.sql` - Added team_quotas table, idx_team_quotas_team_period index, idx_providers_team_channel_type unique index
- `apps/api/alrt/queries/quotas.py` - New file: UPSERT_QUOTA and GET_QUOTA_STATUS SQL constants
- `apps/api/alrt/queries/providers.py` - Appended 5 alrt_hosted constants after existing CREATE/LIST/FIND/DELETE constants

## Decisions Made

- No `created_at` on team_quotas — `period_start` serves as the row identity timestamp
- Quota `over_limit` uses post-increment comparison `(team_quotas.monthly_count + 1) > $2` so it reflects the actual state after the current delivery
- Unique index on `(team_id, channel, provider_type)` scopes to provider_type so BYOC providers (resend, sendgrid, slack_oauth) are unaffected
- Slack alrt_hosted created as inactive placeholder at signup (`is_active = false`, `config = {"status": "pending"}`) — activated only on OAuth callback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All query constants exist for Plan 02-02 (API routes: channels status, quota enforcement)
- All query constants exist for Plan 02-03 (Celery worker: UPSERT_QUOTA on delivery)
- UPSERT_SLACK_ALRT_HOSTED ready for Plan 02-04 (Slack OAuth callback)
- Schema additions are additive (IF NOT EXISTS) — safe to apply to existing databases

---
*Phase: 02-shared-sending-infrastructure*
*Completed: 2026-02-28*
