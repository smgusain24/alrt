---
phase: 04-new-channels-whatsapp-discord-telegram
plan: 05
subsystem: api
tags: [fastapi, asyncpg, celery, whatsapp, discord, telegram, dlq]

# Dependency graph
requires:
  - phase: 04-new-channels-whatsapp-discord-telegram
    provides: "Phase 4 plans 01-04: WhatsApp/Discord/Telegram workers, DB schema, celery queues, dashboard UI"
provides:
  - "Inline subscriber trigger works correctly with 8-param UPSERT_BY_EXTERNAL_ID for all channels"
  - "DLQ retry endpoint handles all 6 channels (email, slack, in_app, whatsapp, discord, telegram)"
affects: ["WA-01", "WA-02", "WA-03", "WA-04", "DC-01", "DC-02", "DC-03", "TG-01", "TG-02", "TG-03"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Param-count alignment: inline upsert always passes None for channel-specific fields not set via trigger API"
    - "DLQ task_map and queue_map must be extended in lockstep whenever a new channel is added"

key-files:
  created: []
  modified:
    - apps/api/alrt/routes/events.py
    - apps/api/alrt/routes/notifications.py

key-decisions:
  - "None — both fixes are surgical corrections of clear bugs; no architectural choices required"

patterns-established:
  - "channel-map lockstep: task_map and queue_map in retry_dead_letter must always have identical key sets"

requirements-completed: [WA-01, WA-02, WA-03, WA-04, DC-01, DC-02, DC-03, TG-01, TG-02, TG-03]

# Metrics
duration: 1min
completed: 2026-03-06
---

# Phase 4 Plan 05: Integration Bug Fixes Summary

**Surgical param-count and channel-map fixes that unblock inline subscriber triggers and DLQ retry for all 6 channels**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-06T05:41:47Z
- **Completed:** 2026-03-06T05:42:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed asyncpg param count error in `_resolve_subscriber` — now passes all 8 params matching `UPSERT_BY_EXTERNAL_ID` ($1-$8)
- Added `whatsapp`, `discord`, and `telegram` entries to `task_map` and `queue_map` in `retry_dead_letter` — all 6 channels now route correctly
- Phase 4 requirements WA-01 through TG-03 unblocked from SATISFIED status

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix events.py _resolve_subscriber param count mismatch** - `12ba9ae` (fix)
2. **Task 2: Add Phase 4 channels to DLQ retry task_map and queue_map** - `8cdc771` (fix)

## Files Created/Modified
- `apps/api/alrt/routes/events.py` - Updated `_resolve_subscriber` param list from 6 to 8 values; added `None` for `discord_webhook_url` ($6) and `telegram_chat_id` ($7); updated docstring
- `apps/api/alrt/routes/notifications.py` - Added `whatsapp`, `discord`, `telegram` to both `task_map` and `queue_map` in `retry_dead_letter`

## Decisions Made
None — both fixes are surgical corrections of clear bugs; no architectural choices required.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 10 Phase 4 requirements (WA-01 through TG-03) now have the integration plumbing to reach SATISFIED status
- Phase 4 is complete — all 5 plans executed
- Ready to proceed to Phase 5 (White-Label & Pricing Tiers) or any next milestone phase

---
*Phase: 04-new-channels-whatsapp-discord-telegram*
*Completed: 2026-03-06*
