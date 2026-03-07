---
phase: 02-shared-sending-infrastructure
plan: 05
subsystem: api
tags: [fastapi, nextjs, quota, notifications, dashboard]

# Dependency graph
requires:
  - phase: 02-shared-sending-infrastructure
    provides: "team_quotas table + UPSERT_QUOTA/GET_QUOTA_STATUS queries (02-01), quota increments in email/slack workers (02-03, 02-04)"
provides:
  - "GET /teams/{team_id}/quota endpoint returning over_limit and monthly_count"
  - "api.teams.getQuota(teamId) TypeScript method in api.ts"
  - "Sticky quota warning banner in dashboard layout across all authenticated pages"
affects: [03-whatsapp-channel, 04-white-label-pricing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-critical async fetch pattern: quota check fails silently so dashboard remains usable if quota service is down"
    - "Soft limit enforcement: banner-only (no delivery blocking) — teams see warning but sending continues"

key-files:
  created: []
  modified:
    - apps/api/alrt/routes/teams.py
    - apps/dashboard/src/lib/api.ts
    - apps/dashboard/src/app/(dashboard)/layout.tsx

key-decisions:
  - "Banner copy is generic — no usage count shown per user decision (avoids exposing raw quota numbers)"
  - "Quota check is fire-and-forget in layout useEffect — catches errors silently so a quota API failure never breaks the dashboard"
  - "Banner injected in (dashboard) layout.tsx so it appears on ALL authenticated pages without per-page changes"
  - "Endpoint defaults to over_limit=false/monthly_count=0 when no quota row exists — safe default for new teams"
  - "Authorization check: current_team must match team_id path param — prevents cross-team quota leakage"

patterns-established:
  - "Non-critical dashboard fetch: useEffect with .catch(() => {}) so UI degradation is graceful"
  - "Quota warning: soft-limit banner in layout.tsx, no delivery blocking at API level"

requirements-completed: [INFRA-03]

# Metrics
duration: 15min
completed: 2026-02-28
---

# Phase 02 Plan 05: Quota Warning Banner Summary

**GET /teams/{team_id}/quota endpoint + sticky dashboard warning banner that surfaces over-limit status across all authenticated pages**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-28T08:10:00Z
- **Completed:** 2026-02-28T08:26:11Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Added GET /teams/{team_id}/quota to teams router — queries GET_QUOTA_STATUS, returns over_limit + monthly_count with safe defaults for teams with no quota row
- Added api.teams.getQuota(teamId) typed method to the dashboard API client
- Injected quota warning banner into dashboard layout.tsx — fires on user load, shows yellow retro-styled banner across all dashboard pages when over_limit=true
- Human verified via checkpoint: API returns correct shape, banner renders with generic copy, no usage count displayed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add GET /teams/{team_id}/quota endpoint and api.ts getQuota method** - `fdf748d` (feat)
2. **Task 2: Add quota warning banner to dashboard layout** - `e82f9bf` (feat)
3. **Task 3: Verify quota banner appears and API responds correctly** - human-verify checkpoint (approved)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `apps/api/alrt/routes/teams.py` - Added GET /{team_id}/quota endpoint with quotas_q.GET_QUOTA_STATUS query and 403 team ownership check
- `apps/dashboard/src/lib/api.ts` - Added api.teams.getQuota(teamId) returning { over_limit: boolean; monthly_count: number }
- `apps/dashboard/src/app/(dashboard)/layout.tsx` - Added quotaExceeded state, second useEffect dependent on user, yellow warning banner in JSX

## Decisions Made
- Banner copy is generic: "You've exceeded your monthly notification limit. Contact support to continue sending." — no monthly_count in the UI per locked user decision
- Quota check in layout.tsx uses a catch-all `.catch(() => {})` — quota unavailability should never break the dashboard
- Endpoint returns `{"over_limit": false, "monthly_count": 0}` by default when row doesn't exist (new teams or teams below limit with no row yet)
- Authorization enforces `current_team == team_id` to prevent cross-team quota disclosure

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- INFRA-03 requirement fully closed: quota tracked in DB (02-01), incremented by workers (02-03, 02-04), surfaced in dashboard (02-05)
- Phase 02 complete — all 5 plans executed
- Ready for Phase 03 (WhatsApp Channel) when applicable

## Self-Check: PASSED

- FOUND: .planning/phases/02-shared-sending-infrastructure/02-05-SUMMARY.md
- FOUND: commit fdf748d (feat(02-05): add GET /teams/{team_id}/quota endpoint and api.ts getQuota method)
- FOUND: commit e82f9bf (feat(02-05): add quota warning banner to dashboard layout)

---
*Phase: 02-shared-sending-infrastructure*
*Completed: 2026-02-28*
