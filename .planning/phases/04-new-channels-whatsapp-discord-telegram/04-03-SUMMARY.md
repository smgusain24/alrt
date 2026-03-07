---
phase: 04-new-channels-whatsapp-discord-telegram
plan: 03
subsystem: api
tags: [whatsapp, meta-cloud-api, celery, webhook, hmac, httpx]

# Dependency graph
requires:
  - phase: 04-01
    provides: WHATSAPP_RETRY policy, step_runner whatsapp branch, subscriber phone_number field, whatsapp_app_secret config

provides:
  - WhatsApp Meta Cloud API delivery Celery task (text/template/media)
  - wamid storage in notification payload for status callback matching
  - GET/POST /webhooks/whatsapp endpoints for Meta delivery status callbacks
  - HMAC-SHA256 X-Hub-Signature-256 verification for webhook security

affects:
  - 04-04 (Discord delivery worker — same channel task pattern)
  - 04-05 (Telegram delivery worker — same channel task pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC-SHA256 body signature verification on public webhook endpoints (same pattern as Slack X-Slack-Signature)"
    - "wamid stored in notifications.payload JSONB for async status callback matching"
    - "_TemplateRequiredError marks notification pending (not DLQ) — business rule, not failure"
    - "Phone normalization: re.sub(r'[^\\d]', '', phone) strips all non-digits for E.164"
    - "Three send modes: text (freeform session), template (pre-approved), media (image/doc/video)"

key-files:
  created:
    - apps/workers/alrt_workers/tasks/channels/whatsapp.py
  modified:
    - apps/api/alrt/routes/channels.py

key-decisions:
  - "hmac.new() (not hmac.new) used for signature verification — Meta uses X-Hub-Signature-256 header with sha256=<hex> format, no timestamp prefix (unlike Slack)"
  - "_TemplateRequiredError (codes 131026/132000) marks notification as pending with 'Template required - no active session' error_reason — NOT DLQ, because this is a business rule (24h session expired), not an infrastructure failure"
  - "whatsapp_app_secret reused as webhook verify_token for Meta hub.challenge — avoids adding a separate config field"
  - "Q_STORE_WAMID uses payload || $2::jsonb (merge, not overwrite) to preserve existing payload fields alongside wamid"
  - "Template parameter auto-mapping: template_variables list in template_data maps to positional payload lookups, passed as positional params to Meta API components"

patterns-established:
  - "Public webhook endpoints (no auth) with HMAC signature verification — skip in dev mode when secret is empty"
  - "wamid stored after successful send, enables asynchronous status updates via webhook callbacks"
  - "Q_UPDATE_WHATSAPP_STATUS uses payload->>'wamid' JSONB lookup to find notification by Meta message ID"

requirements-completed: [WA-01, WA-03, WA-04]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 04 Plan 03: WhatsApp Delivery Worker + Webhook Summary

**WhatsApp Meta Cloud API delivery via Celery task (text/template/media) with wamid-based async status tracking via signed webhooks**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T03:32:19Z
- **Completed:** 2026-03-06T03:34:27Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `whatsapp.py` Celery task supporting three send modes: freeform text (session-gated), pre-approved template (works without session), and media (image/document/video by URL)
- Implemented wamid storage in notification payload after every successful send — enables asynchronous delivery status tracking via Meta webhook callbacks
- Added GET/POST `/webhooks/whatsapp` to `channels.py` with X-Hub-Signature-256 HMAC verification, matching notification rows by `payload->>'wamid'` JSONB lookup and updating status to sent/delivered/read/failed
- Session window handling: freeform message failure (codes 131026/132000) marks notification as `pending` with reason "Template required - no active session", not DLQ

## Task Commits

Each task was committed atomically:

1. **Task 1: WhatsApp Meta Cloud API delivery worker** - `55fc57c` (feat)
2. **Task 2: WhatsApp webhook endpoint for delivery status callbacks** - `74d4bed` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `apps/workers/alrt_workers/tasks/channels/whatsapp.py` - Full WhatsApp delivery Celery task (306 lines); three send helpers, phone normalization, wamid storage, template-required error handling, quota increment
- `apps/api/alrt/routes/channels.py` - Added Q_UPDATE_WHATSAPP_STATUS query constant, `_verify_whatsapp_signature()` helper, GET and POST `/webhooks/whatsapp` endpoints (89 lines added)

## Decisions Made

- `hmac.new()` used for HMAC (not `hmac.HMAC`) — same pattern as existing Slack signature verification in the same file
- `_TemplateRequiredError` (Meta error codes 131026/132000) marks notification `pending` with "Template required - no active session" — this is a business rule (24h session window expired), not an infrastructure failure, so DLQ would be wrong
- `whatsapp_app_secret` reused as the Meta hub.verify_token — avoids a separate config field; secret is shared between webhook verification and hub challenge verification
- `Q_STORE_WAMID` uses `payload || $2::jsonb` (JSONB merge) to add wamid alongside existing payload fields without overwriting them
- Template parameter auto-mapping: `template_variables` list in `template_data` provides ordered variable names, values looked up from `payload` dict, passed as positional params to Meta API `components` array

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — WhatsApp credentials (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`) were already added to `config.py` in plan 04-01. Workers read `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` directly from environment variables.

## Next Phase Readiness

- WhatsApp channel fully operational: delivery worker + async status tracking via Meta webhooks
- Same pattern (channel delivery task + webhook for callbacks) ready to apply to Discord (04-04) and Telegram (04-05)
- Discord and Telegram are simpler: no session window, no template approval flow, no wamid concept

---
*Phase: 04-new-channels-whatsapp-discord-telegram*
*Completed: 2026-03-06*
