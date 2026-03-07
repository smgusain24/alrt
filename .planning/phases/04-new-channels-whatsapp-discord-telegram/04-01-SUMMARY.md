---
phase: 04-new-channels-whatsapp-discord-telegram
plan: 01
subsystem: api, database, infra
tags: [whatsapp, discord, telegram, celery, fastapi, postgres, pydantic]

# Dependency graph
requires:
  - phase: 02-shared-sending-infrastructure
    provides: providers table, alrt_hosted pattern, VALID_CHANNELS, retry.py RetryPolicy, channel task routing

provides:
  - VALID_CHANNELS and ChannelType expanded to 6 channels (in_app, email, slack, whatsapp, discord, telegram)
  - subscribers table with discord_webhook_url and telegram_chat_id columns
  - Subscriber Pydantic models expose phone_number, discord_webhook_url, telegram_chat_id
  - config.py Settings with whatsapp_token, whatsapp_phone_number_id, whatsapp_app_secret, telegram_bot_token
  - WHATSAPP_RETRY, DISCORD_RETRY, TELEGRAM_RETRY policies in retry.py
  - Celery queues and task routes for whatsapp, discord, telegram deliver tasks
  - step_runner dispatch branches for whatsapp, discord, telegram
  - providers.py alrt_hosted query constants for whatsapp, discord, telegram + ACTIVATE_ALRT_HOSTED_CHANNEL

affects: [04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New channel onboarding pattern: schema column + migration + Pydantic field + SQL query + route param + Celery route + step_runner branch + retry policy + provider query"
    - "CHANNEL_ALIASES dict for step_runner handles user-friendly aliases (wa=whatsapp)"

key-files:
  created: []
  modified:
    - schema.sql
    - apps/api/alrt/db.py
    - apps/api/alrt/config.py
    - apps/api/alrt/schemas/event.py
    - apps/api/alrt/schemas/subscriber.py
    - apps/api/alrt/queries/subscribers.py
    - apps/api/alrt/queries/providers.py
    - apps/api/alrt/routes/subscribers.py
    - apps/workers/alrt_workers/utils/retry.py
    - apps/workers/alrt_workers/celery_app.py
    - apps/workers/alrt_workers/tasks/step_runner.py

key-decisions:
  - "phone_number exposed in Pydantic schemas for the first time in this plan (was DB-only before), alongside discord_webhook_url and telegram_chat_id"
  - "UPSERT_BY_EXTERNAL_ID updated to include discord_webhook_url and telegram_chat_id with COALESCE so inline subscriber upsert preserves existing values"
  - "WHATSAPP_RETRY mirrors EMAIL_RETRY (5 retries, 30s, backoff 3600s) — same criticality for business messages; DISCORD and TELEGRAM use lighter 3-retry policy"
  - "alrt_hosted provider placeholders for whatsapp/discord/telegram use status=pending pattern matching existing Slack pattern — activated via dashboard toggle"
  - "ACTIVATE_ALRT_HOSTED_CHANNEL is a generic update query (vs channel-specific upserts) because activation config differs per channel"

patterns-established:
  - "step_runner CHANNEL_ALIASES: add short alias here when adding a channel (wa=whatsapp pattern)"
  - "New channel retry policy: match business criticality — email/whatsapp=5 retries, slack/discord/telegram=3 retries"

requirements-completed: [WA-02, DC-01, TG-01]

# Metrics
duration: 4min
completed: 2026-03-06
---

# Phase 04 Plan 01: Shared Backend Foundation for New Channels Summary

**Expanded subscriber model, VALID_CHANNELS, step_runner dispatch, and Celery routing to cover WhatsApp, Discord, and Telegram alongside 3 new alrt_hosted provider query constants and retry policies**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T03:24:35Z
- **Completed:** 2026-03-06T03:28:12Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Expanded channel type system from 3 to 6 channels (whatsapp, discord, telegram added to VALID_CHANNELS and ChannelType Literal)
- Extended subscribers table and all CRUD queries to store discord_webhook_url and telegram_chat_id, plus exposed phone_number in Pydantic models for the first time
- Wired full worker infrastructure: WHATSAPP/DISCORD/TELEGRAM retry policies, Celery queue routes, step_runner dispatch branches, and alrt_hosted provider queries ready for channel-specific plans

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema, config, and subscriber model extensions** - `b33faa6` (feat)
2. **Task 2: Worker infrastructure — retry policies, Celery routing, step_runner dispatch** - `a26f0a9` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `schema.sql` - Added discord_webhook_url (VARCHAR 500) and telegram_chat_id (VARCHAR 100) columns to subscribers CREATE TABLE
- `apps/api/alrt/db.py` - Added new columns to SCHEMA_SQL subscribers table; added 2 ALTER TABLE entries to SCHEMA_MIGRATIONS
- `apps/api/alrt/config.py` - Added whatsapp_token, whatsapp_phone_number_id, whatsapp_app_secret, telegram_bot_token Settings fields
- `apps/api/alrt/schemas/event.py` - VALID_CHANNELS and ChannelType now include whatsapp, discord, telegram (6 total)
- `apps/api/alrt/schemas/subscriber.py` - CreateSubscriber, UpdateSubscriber, SubscriberResponse all expose phone_number, discord_webhook_url, telegram_chat_id
- `apps/api/alrt/queries/subscribers.py` - All 7 queries (CREATE, UPSERT, UPDATE, FIND_BY_ID, FIND_BY_EXTERNAL_ID, LIST_BY_TEAM, UPDATE_PREFERENCES) updated with new columns
- `apps/api/alrt/queries/providers.py` - Added CREATE_ALRT_HOSTED_WHATSAPP, CREATE_ALRT_HOSTED_DISCORD, CREATE_ALRT_HOSTED_TELEGRAM, ACTIVATE_ALRT_HOSTED_CHANNEL
- `apps/api/alrt/routes/subscribers.py` - POST (create) and PATCH (update) handlers pass phone_number, discord_webhook_url, telegram_chat_id to SQL queries
- `apps/workers/alrt_workers/utils/retry.py` - Added WHATSAPP_RETRY, DISCORD_RETRY, TELEGRAM_RETRY policies
- `apps/workers/alrt_workers/celery_app.py` - Added whatsapp/discord/telegram task_routes and channel module imports
- `apps/workers/alrt_workers/tasks/step_runner.py` - Added elif branches for whatsapp, discord, telegram in _handle_channel(); added 'wa' alias in CHANNEL_ALIASES

## Decisions Made
- phone_number was already in the DB schema but not exposed in Pydantic schemas. Added it alongside discord_webhook_url and telegram_chat_id in all three subscriber models.
- WHATSAPP_RETRY policy (5 retries, 30s, backoff to 3600s) matches EMAIL_RETRY — WhatsApp messages carry same business criticality as email. DISCORD_RETRY and TELEGRAM_RETRY use lighter 3-retry configuration.
- ACTIVATE_ALRT_HOSTED_CHANNEL uses a generic channel parameter ($2) rather than channel-specific queries, since activation config (e.g. phone_number_id for WhatsApp) varies per channel but the query structure is identical.
- alrt_hosted placeholders for new channels follow existing Slack pattern (status=pending, is_active=false at insert) to keep provider activation flow consistent across channels.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan. Channel-specific credentials (whatsapp_token, telegram_bot_token) will be documented in subsequent channel plans.

## Next Phase Readiness

- All shared foundation in place for 04-02 (WhatsApp worker), 04-03 (Discord worker), 04-04 (Telegram worker)
- step_runner will dispatch to whatsapp/discord/telegram deliver tasks once channel modules are created in subsequent plans
- Celery will fail to import the three new channel modules at worker startup until they are created — this is expected and planned

---
*Phase: 04-new-channels-whatsapp-discord-telegram*
*Completed: 2026-03-06*
