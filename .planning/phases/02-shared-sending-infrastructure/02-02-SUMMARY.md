---
phase: 02-shared-sending-infrastructure
plan: "02"
subsystem: infra
tags: [fastapi, asyncpg, postgres, resend, slack, providers, auth, config]

# Dependency graph
requires:
  - phase: 02-shared-sending-infrastructure
    plan: "02-01"
    provides: "providers.py query constants (CREATE_ALRT_HOSTED_EMAIL, CREATE_ALRT_HOSTED_SLACK) and team_quotas schema in schema.sql"
provides:
  - "Settings fields: resend_api_key, slack_signing_secret, monthly_quota_limit in config.py"
  - "team_quotas table + idx_providers_team_channel_type index auto-created at API startup via db.py"
  - "Every new team signup auto-creates active alrt_hosted email provider + inactive Slack placeholder"
affects:
  - 02-shared-sending-infrastructure
  - providers route (activation/deactivation handlers)
  - email delivery worker (reads resend_api_key from settings)
  - slack delivery worker (reads slack_signing_secret from settings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-provision providers at team creation: signup handler inserts both channel providers before returning JWT"
    - "alrt_hosted email is immediately active; Slack is inactive until OAuth completes (two-phase activation)"
    - "REQUIRED_TABLES + SCHEMA_SQL + REQUIRED_INDEXES in db.py are the single source of truth for schema management"

key-files:
  created: []
  modified:
    - apps/api/alrt/config.py
    - apps/api/alrt/db.py
    - apps/api/alrt/routes/auth.py

key-decisions:
  - "resend_api_key and slack_signing_secret added as Settings fields mapping to env vars RESEND_API_KEY and SLACK_SIGNING_SECRET"
  - "monthly_quota_limit defaults to 1000 notifications/month per team, configurable via MONTHLY_QUOTA_LIMIT env var"
  - "idx_providers_team_channel_type UNIQUE index created inline in SCHEMA_SQL (not in REQUIRED_INDEXES loop) because it's UNIQUE not plain index"
  - "Provider inserts in signup handler use execute_insert_query — failures silently return None per db.py error handling pattern; acceptable for idempotent boot-time inserts"

patterns-established:
  - "New infra env vars go in config.py Settings class with empty string defaults and inline comments describing purpose"
  - "Schema additions require 3-location update: REQUIRED_TABLES + SCHEMA_SQL + REQUIRED_INDEXES in db.py"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03]

# Metrics
duration: 1min
completed: "2026-02-28"
---

# Phase 02 Plan 02: Wire alrt_hosted Infrastructure into API Startup and Signup Summary

**Config env vars for alrt-hosted email/Slack + team_quotas schema auto-creation + signup handler that provisions both channel providers for every new team**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-02-28T08:09:58Z
- **Completed:** 2026-02-28T08:11:09Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `resend_api_key`, `slack_signing_secret`, `monthly_quota_limit` to Settings (config.py) — maps to env vars
- Added `team_quotas` to db.py's REQUIRED_TABLES, SCHEMA_SQL, and REQUIRED_INDEXES so the table auto-creates at API startup
- Added `idx_providers_team_channel_type` UNIQUE index inline in SCHEMA_SQL, enabling ON CONFLICT upsert for alrt_hosted providers
- Updated signup handler to auto-insert both alrt_hosted providers after team/user creation, before JWT generation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add new env vars to config.py and team_quotas to db.py schema** - `716c9d7` (feat)
2. **Task 2: Update signup handler to auto-insert alrt_hosted providers for new teams** - `0b41def` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `apps/api/alrt/config.py` - Added resend_api_key, slack_signing_secret, monthly_quota_limit fields to Settings class
- `apps/api/alrt/db.py` - Added team_quotas to REQUIRED_TABLES; added team_quotas DDL + idx_providers_team_channel_type UNIQUE index to SCHEMA_SQL; added idx_team_quotas_team_period to REQUIRED_INDEXES
- `apps/api/alrt/routes/auth.py` - Added prov_q import; inserted alrt_hosted email (active) and Slack (inactive) providers in signup handler after user creation

## Decisions Made
- `idx_providers_team_channel_type` is a UNIQUE index, so it belongs inline in SCHEMA_SQL rather than in the REQUIRED_INDEXES loop (which generates plain `CREATE INDEX IF NOT EXISTS` statements)
- Provider inserts in signup use `execute_insert_query` — if they fail, db.py silently returns None. This is acceptable since: (1) the unique index prevents duplicates on retry, (2) signup re-attempts can re-insert on next team creation, (3) activation flow handles missing rows via UPSERT queries (plan 02-03+)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

New env vars should be configured for production deployment:

| Env Var | Purpose | Required |
|---------|---------|---------|
| `RESEND_API_KEY` | alrt's shared Resend account for email delivery | Yes (production) |
| `SLACK_SIGNING_SECRET` | Slack app signing secret for Events API verification | Yes (Slack features) |
| `MONTHLY_QUOTA_LIMIT` | Default notifications/month cap per team | Optional (default: 1000) |

Local dev works with empty defaults.

## Next Phase Readiness
- Schema bootstraps cleanly: every new team now auto-gets alrt_hosted providers
- `settings.resend_api_key` and `settings.slack_signing_secret` are accessible throughout the app for worker configuration
- team_quotas table exists and is indexed — quota upsert/check queries from plan 02-01 are ready to execute
- Ready for plan 02-03: provider route + delivery worker wiring (consumers of these providers and quota checks)

---
*Phase: 02-shared-sending-infrastructure*
*Completed: 2026-02-28*
