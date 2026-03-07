---
phase: 04-new-channels-whatsapp-discord-telegram
verified: 2026-03-06T12:00:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 8/10
  gaps_closed:
    - "events.py _resolve_subscriber now passes 8 params to UPSERT_BY_EXTERNAL_ID — None, None inserted at positions 6-7 for discord_webhook_url and telegram_chat_id; sub.data shifted to $8 (lines 69-71)"
    - "notifications.py retry_dead_letter task_map and queue_map now include whatsapp, discord, and telegram entries (lines 146-148, 159-161)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "WhatsApp delivery end-to-end"
    expected: "Triggering an event for a subscriber with phone_number sends a WhatsApp message via Meta Cloud API; wamid stored; status tracked via webhook"
    why_human: "Requires live WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET env vars and a real phone number"
  - test: "WhatsApp webhook callback"
    expected: "Meta POSTs delivery status to /webhooks/whatsapp; notification status transitions from sent to delivered to read"
    why_human: "Requires a publicly reachable webhook URL and active Meta app configuration"
  - test: "Discord delivery end-to-end"
    expected: "Triggering an event for a subscriber with discord_webhook_url sends an embed message to Discord"
    why_human: "Requires a real Discord webhook URL and a running Celery worker"
  - test: "Telegram delivery end-to-end"
    expected: "Triggering an event for a subscriber with telegram_chat_id sends a message via Telegram Bot API"
    why_human: "Requires a real TELEGRAM_BOT_TOKEN and a chat_id registered with the bot"
  - test: "DLQ retry for new channels"
    expected: "POST /notifications/{id}/retry for a dead-lettered whatsapp/discord/telegram notification re-enqueues the delivery task to the correct channel queue and returns 200"
    why_human: "Requires running Celery with the channel queues and a broken delivery endpoint to force DLQ state"
  - test: "Provider settings page renders 6 channel cards"
    expected: "WhatsApp card has toggle, Discord card has webhook URL input with setup guide, Telegram card shows chat_id instructions"
    why_human: "Visual layout and interaction need browser verification"
  - test: "Workflow builder shows 6 channel types"
    expected: "NodePalette has WhatsApp/Discord/Telegram draggable icons with brand colors; ChannelNode displays correct brand icons; ConfigPanel shows channel-specific fields"
    why_human: "UI rendering and drag-and-drop interaction require browser testing"
---

# Phase 4: New Channels (WhatsApp, Discord, Telegram) Verification Report

**Phase Goal:** Expand from 3 channels to 6. Add WhatsApp (Meta Cloud API), Discord (webhooks), and Telegram (Bot API) as delivery channels. All three use alrt-hosted credentials by default — zero setup for startups.
**Verified:** 2026-03-06T12:00:00Z
**Status:** human_needed — all automated checks pass; end-to-end delivery requires live credentials
**Re-verification:** Yes — after gap closure by plan 04-05

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Subscriber model accepts discord_webhook_url and telegram_chat_id fields via API | VERIFIED | CreateSubscriber, UpdateSubscriber, SubscriberResponse in schemas/subscriber.py all expose these fields; routes/subscribers.py passes them to DB |
| 2 | VALID_CHANNELS includes whatsapp, discord, telegram alongside existing in_app, email, slack | VERIFIED | schemas/event.py line 7: `VALID_CHANNELS = {"in_app", "email", "slack", "whatsapp", "discord", "telegram"}` |
| 3 | step_runner dispatches to whatsapp, discord, and telegram deliver tasks | VERIFIED | tasks/step_runner.py lines 124-132: three elif branches with lazy imports and deliver.delay() calls |
| 4 | Celery routes whatsapp/discord/telegram deliver tasks to dedicated queues | VERIFIED | celery_app.py lines 34-36: task_routes for all three; imports list includes all three |
| 5 | Config has env vars for whatsapp_token, whatsapp_phone_number_id, whatsapp_app_secret, telegram_bot_token | VERIFIED | config.py: all four Settings fields present |
| 6 | WhatsApp deliver task sends messages via Meta Cloud API (text/template/media) | VERIFIED | whatsapp.py: three send helpers posting to graph.facebook.com; phone normalization, wamid storage, DLQ, TEMPLATE_REQUIRED_ERRORS handling all implemented |
| 7 | Discord deliver task sends an embed message to a webhook URL from subscriber or team provider | VERIFIED | discord.py: subscriber-level discord_webhook_url checked first, then team provider fallback; _send_discord_message() builds embed; plain content fallback when embed_enabled=False |
| 8 | Telegram deliver task sends a message via Bot API sendMessage to subscriber's chat_id | VERIFIED | telegram.py: TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"; 429 retry_after handling; DLQ on 400/401/403 |
| 9 | Webhook endpoint at /webhooks/whatsapp receives delivery status updates | VERIFIED | channels.py: GET hub.challenge verification + POST status update endpoint; HMAC-SHA256 via X-Hub-Signature-256; wamid lookup in JSONB payload via Q_UPDATE_WHATSAPP_STATUS |
| 10 | /events/trigger works end-to-end for inline subscriber upsert with all 6 channel params | VERIFIED | events.py _resolve_subscriber lines 61-73: passes 8 params — [team_id, sub.id, sub.email, sub.name, sub.phone, None, None, sub.data or {}] — correctly matches UPSERT_BY_EXTERNAL_ID $1-$8; docstring updated (lines 57-59) |
| 11 | Dead-letter notifications for whatsapp/discord/telegram can be retried via API | VERIFIED | notifications.py retry_dead_letter lines 142-161: task_map includes whatsapp/discord/telegram task paths; queue_map includes whatsapp/discord/telegram queue names |

**Score:** 11/11 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/alrt/schemas/event.py` | VALID_CHANNELS and ChannelType with 6 channels | VERIFIED | Line 7-8: both include all 6 channels |
| `apps/api/alrt/schemas/subscriber.py` | CreateSubscriber/UpdateSubscriber/SubscriberResponse with new fields | VERIFIED | All three models expose phone_number, discord_webhook_url, telegram_chat_id |
| `apps/workers/alrt_workers/tasks/step_runner.py` | Dispatch branches for whatsapp, discord, telegram | VERIFIED | Lines 124-132: three elif branches present |
| `apps/workers/alrt_workers/celery_app.py` | Queue routes and imports for whatsapp/discord/telegram | VERIFIED | task_routes and imports both include all three new channels |
| `apps/api/alrt/config.py` | New channel env var fields | VERIFIED | whatsapp_token, whatsapp_phone_number_id, whatsapp_app_secret, telegram_bot_token all present |
| `schema.sql` | discord_webhook_url and telegram_chat_id columns | VERIFIED | Lines 49-50: both columns in CREATE TABLE subscribers |
| `apps/api/alrt/queries/subscribers.py` | All queries updated with new columns (8-param UPSERT) | VERIFIED | UPSERT_BY_EXTERNAL_ID has 8 params ($1-$8); all subscriber queries include new columns |
| `apps/api/alrt/queries/providers.py` | CREATE_ALRT_HOSTED_WHATSAPP/DISCORD/TELEGRAM + ACTIVATE_ALRT_HOSTED_CHANNEL | VERIFIED | All four query constants present |
| `apps/workers/alrt_workers/tasks/channels/discord.py` | Discord webhook delivery Celery task, min 80 lines | VERIFIED | 202 lines; deliver() present; subscriber fallback to team provider; embeds + plain content; DLQ on 400/401/403/404 |
| `apps/workers/alrt_workers/tasks/channels/telegram.py` | Telegram Bot API delivery Celery task, min 80 lines | VERIFIED | 190 lines; deliver() present; TELEGRAM_API_URL used; retry_after countdown for 429; DLQ on 400/401/403 |
| `apps/workers/alrt_workers/tasks/channels/whatsapp.py` | WhatsApp Meta Cloud API delivery Celery task, min 120 lines | VERIFIED | 308 lines; deliver() present; three send helpers; wamid stored; _normalize_phone strips non-digits |
| `apps/api/alrt/routes/channels.py` | GET + POST /webhooks/whatsapp endpoints | VERIFIED | Both endpoints present; HMAC-SHA256 signature verification; hub.challenge GET handler |
| `apps/api/alrt/routes/events.py` | _resolve_subscriber passes 8 params matching UPSERT_BY_EXTERNAL_ID | VERIFIED | Lines 64-72: [team_id, sub.id, sub.email, sub.name, sub.phone, None, None, sub.data or {}] — 8 values for 8-param query; None at positions 6-7 for discord_webhook_url and telegram_chat_id |
| `apps/api/alrt/routes/notifications.py` | retry_dead_letter covers all 6 channels | VERIFIED | task_map lines 142-149 and queue_map lines 155-162 both include whatsapp, discord, telegram; all 6 channels route correctly |
| `apps/dashboard/src/components/workflow/nodes/ChannelNode.tsx` | Channel node display with brand icons for all 6 channels | VERIFIED | CHANNEL_CONFIG has all 6 entries; SiWhatsapp/SiDiscord/SiTelegram imported |
| `apps/dashboard/src/components/workflow/NodePalette.tsx` | Node palette with 6 channel icons | VERIFIED | NODE_TYPES includes channel_whatsapp, channel_discord, channel_telegram |
| `apps/dashboard/src/components/workflow/ConfigPanel.tsx` | Config panel with channel-specific sections for WhatsApp, Discord, Telegram | VERIFIED | Channel selector has 6 channels; three new sections with correct fields |
| `apps/dashboard/src/app/(dashboard)/settings/providers/page.tsx` | Provider setup page with cards for all 6 channels | VERIFIED | CHANNELS array has 6 entries; ChannelCard component with setup-type-specific render logic |
| `apps/dashboard/src/lib/api.ts` | api.channels namespace with channel methods | VERIFIED | api.channels.list, activateWhatsApp, deactivateWhatsApp, updateDiscordConfig all present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `events.py` | `UPSERT_BY_EXTERNAL_ID` | `_resolve_subscriber` param list | WIRED | Lines 64-72: 8 params — None at $6 discord_webhook_url, None at $7 telegram_chat_id; sub.data at $8 — matches query exactly |
| `notifications.py retry_dead_letter` | `alrt_workers.tasks.channels.{whatsapp,discord,telegram}` | `task_map` lookup | WIRED | Lines 146-148: whatsapp/discord/telegram task paths present; lines 159-161: whatsapp/discord/telegram queue names present |
| `step_runner.py` | `alrt_workers.tasks.channels.whatsapp` | lazy import + deliver.delay() | WIRED | Lines 124-126: lazy import + deliver.delay() with overrides extraction |
| `step_runner.py` | `alrt_workers.tasks.channels.discord` | lazy import + deliver.delay() | WIRED | Lines 127-129: lazy import + deliver.delay() |
| `step_runner.py` | `alrt_workers.tasks.channels.telegram` | lazy import + deliver.delay() | WIRED | Lines 130-132: lazy import + deliver.delay() |
| `celery_app.py` | `alrt_workers.tasks.channels.{whatsapp,discord,telegram}` | task_routes + imports | WIRED | task_routes maps all three to dedicated queues; imports list includes all three |
| `whatsapp.py` | Meta Cloud API | httpx.post to graph.facebook.com | WIRED | WHATSAPP_API_URL used in all three send helpers |
| `discord.py` | Discord webhook URL | httpx.post(webhook_url, json={embeds:[...]}) | WIRED | _send_discord_message() posts to webhook_url with embeds or plain content |
| `telegram.py` | Telegram Bot API | httpx.post(api.telegram.org/bot{token}/sendMessage) | WIRED | _send_telegram_message() posts to TELEGRAM_API_URL.format(token=token) |
| `channels.py` | notifications table | UPDATE WHERE payload->>'wamid'=$1 | WIRED | Q_UPDATE_WHATSAPP_STATUS uses JSONB lookup payload->>'wamid' |
| `whatsapp.py` | notifications.payload | payload || wamid JSON | WIRED | Q_STORE_WAMID: "UPDATE notifications SET payload = payload || $2::jsonb" |
| `NodePalette.tsx` | `ChannelNode.tsx` | node type prefix channel_whatsapp -> ChannelNode data.channel=whatsapp | WIRED | channel_whatsapp in NODE_TYPES; CHANNEL_CONFIG["whatsapp"] in ChannelNode resolves correctly |
| `ConfigPanel.tsx` | template_data | onUpdate writes template fields consumed by worker | WIRED | updateTemplate() updates data.template dict; all three new channel sections call updateTemplate() |
| `providers/page.tsx` | api.channels | activateWhatsApp/deactivateWhatsApp/updateDiscordConfig | WIRED | handleWhatsappToggle() calls api.channels.activateWhatsApp()/deactivateWhatsApp(); handleDiscordSave() calls api.channels.updateDiscordConfig() |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| WA-01 | 04-03, 04-05 | Developer can trigger WhatsApp message delivery via standard /events/trigger API call | SATISFIED | Worker fully implemented and wired; inline subscriber trigger now passes correct 8 params (events.py lines 64-72); param mismatch that caused asyncpg crash is fixed |
| WA-02 | 04-01 | Subscriber profile supports phone_number field for WhatsApp delivery | SATISFIED | schemas/subscriber.py exposes phone_number; all subscriber SQL queries include it; whatsapp.py reads subscriber.get("phone_number") |
| WA-03 | 04-03, 04-04 | WhatsApp message templates configurable in the workflow builder channel node | SATISFIED | ConfigPanel.tsx has WhatsApp section with template_name, media_url, media_type fields; whatsapp.py reads template_data.get("template_name") and dispatches to _send_whatsapp_template() |
| WA-04 | 04-03 | WhatsApp delivery status tracked (sent/delivered/read/failed) in notifications table | SATISFIED | Q_MARK_SENT, Q_MARK_FAILED, Q_MARK_DEAD_LETTER in whatsapp.py; Q_UPDATE_WHATSAPP_STATUS in channels.py webhook updates status by wamid lookup |
| DC-01 | 04-01, 04-02, 04-05 | Developer can trigger Discord message delivery via standard /events/trigger API call using subscriber's discord_webhook_url | SATISFIED | Worker implemented and wired; inline subscriber trigger no longer crashes (events.py fix); DLQ retry routes correctly to discord queue (notifications.py lines 147, 160) |
| DC-02 | 04-02, 04-04 | Discord messages support embed formatting (title, body, color) configurable in workflow builder channel node | SATISFIED | ConfigPanel.tsx Discord section has title/body/color/footer/embed toggle; discord.py _send_discord_message() builds embed with all these fields |
| DC-03 | 04-02, 04-05 | Discord delivery status tracked (sent/failed) in notifications table | SATISFIED | Q_MARK_SENT, Q_MARK_FAILED, Q_MARK_DEAD_LETTER present in discord.py; retry endpoint now returns 200 for discord dead-letter (task_map and queue_map fixed) |
| TG-01 | 04-01, 04-02, 04-05 | Developer can trigger Telegram message delivery via standard /events/trigger API call using subscriber's telegram_chat_id | SATISFIED | Worker implemented and wired; inline subscriber trigger no longer crashes (events.py fix); DLQ retry routes correctly to telegram queue (notifications.py lines 148, 161) |
| TG-02 | 04-02, 04-04 | Telegram messages support Markdown formatting configurable in workflow builder channel node | SATISFIED | ConfigPanel.tsx Telegram section has body + parse_mode selector (Markdown/HTML); telegram.py reads template_data.get("parse_mode", "Markdown") |
| TG-03 | 04-02, 04-05 | Telegram delivery status tracked (sent/failed) in notifications table | SATISFIED | Q_MARK_SENT, Q_MARK_FAILED, Q_MARK_DEAD_LETTER present in telegram.py; 429 rate-limited path uses Q_MARK_DEAD_LETTER on max retries; retry endpoint now returns 200 for telegram dead-letter |

**All 10 phase 4 requirement IDs satisfied.** No orphaned requirements — all 10 IDs (WA-01 through WA-04, DC-01 through DC-03, TG-01 through TG-03) are claimed by plans and accounted for above.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/dashboard/src/components/workflow/ConfigPanel.tsx` | ~492 | "Send Test (coming soon)" disabled button | Info | Deferred feature, not a blocker |

No blocker anti-patterns remain. The two blocker-severity anti-patterns from the previous verification (events.py param mismatch, notifications.py incomplete maps) are resolved.

---

## Human Verification Required

### 1. WhatsApp Delivery End-to-End

**Test:** Configure WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET env vars. Trigger an event for a subscriber with a real phone_number using the inline subscriber object. Confirm the WhatsApp message arrives and the notification row transitions from pending to sent.
**Expected:** Message received on phone; notification status = sent; payload.wamid populated.
**Why human:** Requires live Meta Cloud API credentials and a real phone number in WhatsApp.

### 2. WhatsApp Webhook Callback

**Test:** After a sent message, Meta should POST delivery status to GET/POST /channels/webhooks/whatsapp. Verify notification status updates to delivered then read.
**Expected:** notifications.status transitions from sent to delivered to read as Meta sends callbacks.
**Why human:** Requires a publicly reachable webhook URL and active Meta app configuration.

### 3. Discord Delivery End-to-End

**Test:** Save a Discord webhook URL via the Channels settings page. Trigger an event for a subscriber. Verify embed message appears in Discord channel.
**Expected:** Discord embed with title, description, and blue color appears in the configured channel.
**Why human:** Requires a real Discord server, webhook URL, and running Celery worker.

### 4. Telegram Delivery End-to-End

**Test:** Set TELEGRAM_BOT_TOKEN env var. Create a subscriber with a telegram_chat_id. Trigger an event. Verify Telegram message arrives with Markdown formatting.
**Expected:** Message appears in the Telegram chat with correct formatting.
**Why human:** Requires a real Telegram bot token and a chat_id registered with the bot.

### 5. DLQ Retry for New Channels

**Test:** Trigger delivery to a bad Discord webhook URL (force a dead-letter). Then call POST /notifications/{id}/retry. Verify the notification is re-enqueued to the discord queue and delivery is retried.
**Expected:** Notification status resets; discord Celery queue receives the task; retry returns HTTP 200.
**Why human:** Requires running Celery with discord queue and a broken webhook to force DLQ state.

### 6. Dashboard Visual — Node Palette and ChannelNode

**Test:** Open workflow builder. Verify WhatsApp/Discord/Telegram icons appear with correct brand colors (green/indigo/blue). Drag a WhatsApp channel node onto canvas. Select it and verify ConfigPanel shows body/template_name/media_url fields.
**Expected:** 6 channel icons visible, correct accent colors, WhatsApp config fields render.
**Why human:** Visual rendering and drag-and-drop require browser testing.

### 7. Provider Settings Page — Card Grid

**Test:** Navigate to Settings > Channels. Verify 6 cards render in a 3-column grid. Toggle WhatsApp on. Enter a Discord webhook URL and save. Verify status badges update.
**Expected:** WhatsApp badge changes to "Enabled"; Discord badge changes to "Connected" after save.
**Why human:** Interactive state changes and API calls require browser with running backend.

---

## Re-Verification Summary

Two integration bugs documented in the previous verification were confirmed closed by plan 04-05:

**Gap 1 — CLOSED:** `apps/api/alrt/routes/events.py` `_resolve_subscriber` now passes 8 parameters to `UPSERT_BY_EXTERNAL_ID`. The fix inserts `None, None` at positions 6-7 for `discord_webhook_url` and `telegram_chat_id`, with `sub.data or {}` correctly at position 8. The docstring was updated to document all 8 param mappings ($1-$8). Confirmed at lines 57-72 of the current file.

**Gap 2 — CLOSED:** `apps/api/alrt/routes/notifications.py` `retry_dead_letter` now contains all 6 channels in both `task_map` (lines 142-149) and `queue_map` (lines 155-162). `whatsapp`, `discord`, and `telegram` entries were added with correct Celery task paths and queue names. No regression on the existing `email`, `slack`, and `in_app` entries.

No regressions detected. All 9 previously-passing truths continue to pass. The 2 previously-failing truths now pass. Phase goal is fully achieved at the code level.

---

_Verified: 2026-03-06T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
