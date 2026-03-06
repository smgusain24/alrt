---
phase: 04-new-channels-whatsapp-discord-telegram
verified: 2026-03-06T06:30:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps: []
fix_applied: "Added discord_webhook_url, telegram_chat_id to whatsapp.py Q_GET_SUBSCRIBER for consistency"
    artifacts:
      - path: "apps/workers/alrt_workers/tasks/channels/whatsapp.py"
        issue: "Q_GET_SUBSCRIBER selects only 'phone_number' but not 'discord_webhook_url' or 'telegram_chat_id', unlike discord.py and telegram.py which select all three new columns"
    missing:
      - "Add discord_webhook_url and telegram_chat_id to Q_GET_SUBSCRIBER in whatsapp.py for consistency with plan spec and other workers"
human_verification:
  - test: "WhatsApp delivery end-to-end"
    expected: "Triggering an event for a subscriber with phone_number sends a WhatsApp message via Meta Cloud API; wamid stored; status tracked via webhook"
    why_human: "Requires live WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_APP_SECRET env vars and a real phone number"
  - test: "Discord delivery end-to-end"
    expected: "Triggering an event for a subscriber with discord_webhook_url or a team with Discord provider sends an embed message to Discord"
    why_human: "Requires a real Discord webhook URL and a running Celery worker"
  - test: "Telegram delivery end-to-end"
    expected: "Triggering an event for a subscriber with telegram_chat_id sends a message via Telegram Bot API"
    why_human: "Requires a real TELEGRAM_BOT_TOKEN and a chat_id registered with the bot"
  - test: "Provider settings page renders 6 channel cards"
    expected: "WhatsApp card has toggle, Discord card has webhook URL input with setup guide, Telegram card shows chat_id instructions"
    why_human: "Visual layout and interaction need browser verification"
  - test: "Workflow builder shows 6 channel types"
    expected: "NodePalette has WhatsApp/Discord/Telegram draggable icons with brand colors; ChannelNode displays correct brand icons; ConfigPanel shows channel-specific fields"
    why_human: "UI rendering and drag-and-drop interaction require browser testing"
---

# Phase 4: New Channels (WhatsApp, Discord, Telegram) Verification Report

**Phase Goal:** Expand from 3 channels to 6. Add WhatsApp (Meta Cloud API), Discord (webhooks), and Telegram (Bot API) as delivery channels. All three use alrt-hosted credentials by default — zero setup for startups.
**Verified:** 2026-03-06T06:30:00Z
**Status:** gaps_found (1 minor gap, does not block core delivery functionality)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Subscriber model accepts discord_webhook_url and telegram_chat_id fields via API | VERIFIED | `CreateSubscriber`, `UpdateSubscriber`, `SubscriberResponse` in `schemas/subscriber.py` all have these fields; `queries/subscribers.py` all 7 queries include them |
| 2 | VALID_CHANNELS includes whatsapp, discord, telegram alongside existing in_app, email, slack | VERIFIED | `schemas/event.py` line 7: `VALID_CHANNELS = {"in_app", "email", "slack", "whatsapp", "discord", "telegram"}` |
| 3 | step_runner dispatches to whatsapp, discord, and telegram deliver tasks | VERIFIED | `tasks/step_runner.py` lines 124-132: three `elif` branches present with correct lazy imports and `deliver.delay()` calls |
| 4 | Celery routes whatsapp/discord/telegram deliver tasks to dedicated queues | VERIFIED | `celery_app.py` lines 34-36: three task_routes entries; lines 38-42: three imports in `imports` list |
| 5 | Config has env vars for whatsapp_token, whatsapp_phone_number_id, whatsapp_app_secret, telegram_bot_token | VERIFIED | `config.py` lines 23-27: all four Settings fields present |
| 6 | Discord deliver task sends an embed message to a webhook URL from subscriber or team provider | VERIFIED | `discord.py`: subscriber-level `discord_webhook_url` checked first, then team provider fallback; `_send_discord_message()` builds embed dict with hex-to-int color, 256/4096/2048 char limits |
| 7 | Telegram deliver task sends a message via Bot API sendMessage to subscriber's chat_id | VERIFIED | `telegram.py`: uses `TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"`, `telegram_chat_id` from subscriber, `TELEGRAM_BOT_TOKEN` from env |
| 8 | WhatsApp deliver task sends messages via Meta Cloud API (text/template/media) | PARTIAL | `whatsapp.py` delivers all 3 message types correctly to `graph.facebook.com`; phone normalization, wamid storage, template-required error handling all present. Minor gap: Q_GET_SUBSCRIBER omits discord_webhook_url/telegram_chat_id from SELECT (not needed for WhatsApp but inconsistent with spec) |
| 9 | Webhook endpoint at /webhooks/whatsapp receives delivery status updates | VERIFIED | `channels.py`: GET hub.challenge verification + POST status update endpoint; HMAC-SHA256 via `X-Hub-Signature-256`; wamid lookup in payload JSONB via `Q_UPDATE_WHATSAPP_STATUS` |
| 10 | Dashboard shows 6 channels in workflow builder and provider settings | VERIFIED | `NodePalette.tsx` has 9 NODE_TYPES (6 channels + trigger + delay + condition); `ChannelNode.tsx` CHANNEL_CONFIG has all 6; `ConfigPanel.tsx` channel selector has 6 channels with WhatsApp/Discord/Telegram config sections; `providers/page.tsx` renders 6-channel card grid |

**Score:** 9/10 truths verified (1 partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/alrt/schemas/event.py` | VALID_CHANNELS and ChannelType with 6 channels | VERIFIED | Line 7-8: `VALID_CHANNELS` and `ChannelType` both include all 6 channels |
| `apps/api/alrt/schemas/subscriber.py` | CreateSubscriber/UpdateSubscriber/SubscriberResponse with new channel fields | VERIFIED | All three models expose `phone_number`, `discord_webhook_url`, `telegram_chat_id` |
| `apps/workers/alrt_workers/tasks/step_runner.py` | Dispatch branches for whatsapp, discord, telegram | VERIFIED | Lines 124-132: three `elif` branches; CHANNEL_ALIASES includes `"wa": "whatsapp"` |
| `apps/workers/alrt_workers/utils/retry.py` | WHATSAPP_RETRY, DISCORD_RETRY, TELEGRAM_RETRY policies | VERIFIED | All three defined: WHATSAPP(max_retries=5), DISCORD(3), TELEGRAM(3) |
| `apps/workers/alrt_workers/celery_app.py` | Queue routes and imports for whatsapp/discord/telegram | VERIFIED | task_routes and imports both include all three new channels |
| `apps/api/alrt/config.py` | New channel env var fields | VERIFIED | whatsapp_token, whatsapp_phone_number_id, whatsapp_app_secret, telegram_bot_token all present |
| `schema.sql` | discord_webhook_url and telegram_chat_id columns | VERIFIED | Lines 49-50: both columns in CREATE TABLE subscribers |
| `apps/api/alrt/db.py` | SCHEMA_MIGRATIONS with ALTER TABLE for both new columns | VERIFIED | Lines 253-254: two ALTER TABLE entries present |
| `apps/api/alrt/queries/providers.py` | CREATE_ALRT_HOSTED_WHATSAPP/DISCORD/TELEGRAM + ACTIVATE_ALRT_HOSTED_CHANNEL | VERIFIED | All four query constants present |
| `apps/api/alrt/queries/subscribers.py` | All 7 queries updated with new columns | VERIFIED | CREATE, FIND_BY_ID, FIND_BY_EXTERNAL_ID, UPSERT_BY_EXTERNAL_ID, LIST_BY_TEAM, UPDATE, UPDATE_PREFERENCES all include new columns |
| `apps/workers/alrt_workers/tasks/channels/discord.py` | Discord webhook delivery Celery task, min 80 lines | VERIFIED | 202 lines; `deliver()` present; subscriber-level then team-provider fallback; embeds + plain content; DLQ on 400/401/403/404 |
| `apps/workers/alrt_workers/tasks/channels/telegram.py` | Telegram Bot API delivery Celery task, min 80 lines | VERIFIED | 190 lines; `deliver()` present; TELEGRAM_API_URL used; `retry_after` countdown for 429; DLQ on 400/401/403 |
| `apps/workers/alrt_workers/tasks/channels/whatsapp.py` | WhatsApp Meta Cloud API delivery Celery task, min 120 lines | VERIFIED | 307 lines; `deliver()` present; three send helpers; wamid stored; `_normalize_phone` strips non-digits; TEMPLATE_REQUIRED_ERRORS handled as pending |
| `apps/api/alrt/routes/channels.py` | GET + POST /webhooks/whatsapp endpoints | VERIFIED | Both endpoints present; HMAC-SHA256 signature verification; hub.challenge GET handler; wamid-based notification status updates |
| `apps/dashboard/src/components/workflow/nodes/ChannelNode.tsx` | Channel node display with brand icons for all 6 channels | VERIFIED | CHANNEL_CONFIG has all 6 entries; SiWhatsapp/SiDiscord/SiTelegram imported; LUCIDE_CHANNELS set for rendering differentiation |
| `apps/dashboard/src/components/workflow/NodePalette.tsx` | Node palette with 6 channel icons | VERIFIED | 9 NODE_TYPES including channel_whatsapp, channel_discord, channel_telegram with isSimple flag |
| `apps/dashboard/src/components/workflow/ConfigPanel.tsx` | Config panel with channel-specific sections for WhatsApp, Discord, Telegram | VERIFIED | Channel selector has 6 channels; three new sections present with correct fields |
| `apps/dashboard/src/app/(dashboard)/settings/providers/page.tsx` | Provider setup page with cards for all 6 channels | VERIFIED | CHANNELS array has 6 entries; ChannelCard component with setup-type-specific render logic |
| `apps/dashboard/src/lib/api.ts` | api.channels namespace with channel methods | VERIFIED | `api.channels.list`, `activateWhatsApp`, `deactivateWhatsApp`, `updateDiscordConfig` all present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `step_runner.py` | `alrt_workers.tasks.channels.whatsapp` | lazy import + deliver.delay() | WIRED | Line 125: `from alrt_workers.tasks.channels.whatsapp import deliver`; line 126: `deliver.delay(...)` |
| `step_runner.py` | `alrt_workers.tasks.channels.discord` | lazy import + deliver.delay() | WIRED | Line 128: `from alrt_workers.tasks.channels.discord import deliver`; line 129: `deliver.delay(...)` |
| `step_runner.py` | `alrt_workers.tasks.channels.telegram` | lazy import + deliver.delay() | WIRED | Line 131: `from alrt_workers.tasks.channels.telegram import deliver`; line 132: `deliver.delay(...)` |
| `celery_app.py` | `alrt_workers.tasks.channels.{whatsapp,discord,telegram}` | task_routes + imports | WIRED | task_routes maps all three to dedicated queues; imports list includes all three |
| `whatsapp.py` | Meta Cloud API | httpx.post to graph.facebook.com | WIRED | `WHATSAPP_API_URL = "https://graph.facebook.com/v21.0/{phone_number_id}/messages"` used in all three send helpers |
| `discord.py` | Discord webhook URL | httpx.post(webhook_url, json={embeds:[...]}) | WIRED | `_send_discord_message()` posts to webhook_url with embeds or plain content |
| `telegram.py` | Telegram Bot API | httpx.post(api.telegram.org/bot{token}/sendMessage) | WIRED | `_send_telegram_message()` posts to `TELEGRAM_API_URL.format(token=token)` |
| `channels.py` | notifications table | UPDATE WHERE payload->>'wamid'=$1 | WIRED | `Q_UPDATE_WHATSAPP_STATUS` uses JSONB lookup `payload->>'wamid'` |
| `whatsapp.py` | notifications.payload | payload \|\| wamid JSON | WIRED | `Q_STORE_WAMID = "UPDATE notifications SET payload = payload \|\| $2::jsonb"` called with `json.dumps({"wamid": wamid})` |
| `NodePalette.tsx` | `ChannelNode.tsx` | node type prefix channel_whatsapp -> ChannelNode data.channel=whatsapp | WIRED | `channel_whatsapp` in NODE_TYPES; CHANNEL_CONFIG["whatsapp"] in ChannelNode resolves correctly |
| `ConfigPanel.tsx` | template_data | onUpdate writes template fields consumed by worker | WIRED | `updateTemplate()` updates `data.template` dict; WhatsApp/Discord/Telegram sections all call `updateTemplate()` for their respective fields |
| `providers/page.tsx` | api.channels | activateWhatsApp/deactivateWhatsApp/updateDiscordConfig | WIRED | `handleWhatsappToggle()` calls `api.channels.activateWhatsApp()`/`deactivateWhatsApp()`; `handleDiscordSave()` calls `api.channels.updateDiscordConfig()` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| WA-01 | 04-03 | Developer can trigger WhatsApp message delivery via standard /events/trigger API call | SATISFIED | `step_runner.py` dispatches to `whatsapp.deliver`; `whatsapp.py` handles delivery via Meta Cloud API |
| WA-02 | 04-01 | Subscriber profile supports `phone_number` field for WhatsApp delivery | SATISFIED | `schemas/subscriber.py` exposes `phone_number`; all subscriber SQL queries include it; `whatsapp.py` reads `subscriber.get("phone_number")` |
| WA-03 | 04-03, 04-04 | WhatsApp message templates configurable in the workflow builder channel node | SATISFIED | `ConfigPanel.tsx` has WhatsApp section with `template_name` and `media_url`/`media_type` fields; `whatsapp.py` reads `template_data.get("template_name")` and dispatches to `_send_whatsapp_template()` |
| WA-04 | 04-03 | WhatsApp delivery status tracked (sent/delivered/read/failed) in notifications table | SATISFIED | `Q_MARK_SENT`, `Q_MARK_FAILED`, `Q_MARK_DEAD_LETTER` in `whatsapp.py`; `Q_UPDATE_WHATSAPP_STATUS` in `channels.py` webhook updates status by wamid lookup (delivered/read/failed from Meta) |
| DC-01 | 04-01, 04-02 | Developer can trigger Discord message delivery via standard /events/trigger API call using subscriber's discord_webhook_url | SATISFIED | `step_runner.py` dispatches to `discord.deliver`; `discord.py` reads `subscriber.get("discord_webhook_url")` |
| DC-02 | 04-02, 04-04 | Discord messages support embed formatting (title, body, color) configurable in workflow builder channel node | SATISFIED | `ConfigPanel.tsx` Discord section has title/body/color/footer/embed toggle; `discord.py` `_send_discord_message()` builds embed with all these fields |
| DC-03 | 04-02 | Discord delivery status tracked (sent/failed) in notifications table | SATISFIED | `Q_MARK_SENT`, `Q_MARK_FAILED`, `Q_MARK_DEAD_LETTER` all present in `discord.py` |
| TG-01 | 04-01, 04-02 | Developer can trigger Telegram message delivery via standard /events/trigger API call using subscriber's telegram_chat_id | SATISFIED | `step_runner.py` dispatches to `telegram.deliver`; `telegram.py` reads `subscriber.get("telegram_chat_id")` |
| TG-02 | 04-02, 04-04 | Telegram messages support Markdown formatting configurable in workflow builder channel node | SATISFIED | `ConfigPanel.tsx` Telegram section has body + `parse_mode` selector (Markdown/HTML); `telegram.py` reads `template_data.get("parse_mode", "Markdown")` |
| TG-03 | 04-02 | Telegram delivery status tracked (sent/failed) in notifications table | SATISFIED | `Q_MARK_SENT`, `Q_MARK_FAILED`, `Q_MARK_DEAD_LETTER` all present in `telegram.py`; 429 rate-limited path uses `Q_MARK_DEAD_LETTER` on max retries |

**All 10 requirements (WA-01 through WA-04, DC-01 through DC-03, TG-01 through TG-03) satisfied.**

No orphaned requirements — all phase 4 requirement IDs appear in plan frontmatter and are cross-referenced above.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/dashboard/src/components/workflow/ConfigPanel.tsx` | ~492 | `Send Test (coming soon)` — disabled button | Info | Test send feature deferred; not a blocker for phase 4 scope |
| `apps/workers/alrt_workers/tasks/channels/whatsapp.py` | 25-28 | Q_GET_SUBSCRIBER missing discord_webhook_url and telegram_chat_id from SELECT | Warning | Cosmetic inconsistency: phone_number IS selected correctly (required for WhatsApp); the two omitted columns are not needed by WhatsApp delivery but were specified in the plan and selected by the other two workers |

No blocker anti-patterns found. No placeholder implementations, no empty handlers, no static returns where DB queries are expected.

---

## Human Verification Required

### 1. WhatsApp Delivery End-to-End

**Test:** Configure `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` env vars. Trigger an event for a subscriber with a real `phone_number`. Confirm the WhatsApp message arrives and the notification row transitions from `pending` to `sent`.
**Expected:** Message received on phone; notification status = `sent`; `payload.wamid` populated.
**Why human:** Requires live Meta Cloud API credentials and a real phone number in WhatsApp.

### 2. WhatsApp Webhook Callback

**Test:** After a sent message, Meta should POST delivery status to `GET/POST /channels/webhooks/whatsapp`. Verify notification status updates to `delivered` then `read`.
**Expected:** `notifications.status` transitions from `sent` → `delivered` → `read` as Meta sends callbacks.
**Why human:** Requires a publicly reachable webhook URL and active Meta app configuration.

### 3. Discord Delivery End-to-End

**Test:** Save a Discord webhook URL via the Channels settings page. Trigger an event for a subscriber with no `discord_webhook_url` (so team provider fallback is used). Verify embed message appears in Discord channel.
**Expected:** Discord embed with title, description, and blue color appears in the configured channel.
**Why human:** Requires a real Discord server, webhook URL, and running Celery worker.

### 4. Telegram Delivery End-to-End

**Test:** Set `TELEGRAM_BOT_TOKEN` env var. Create a subscriber with a `telegram_chat_id`. Trigger an event. Verify Telegram message arrives with Markdown formatting.
**Expected:** Message appears in the Telegram chat with correct formatting.
**Why human:** Requires a real Telegram bot token and a chat_id registered with the bot.

### 5. Dashboard Visual — Node Palette and ChannelNode

**Test:** Open workflow builder. Verify WhatsApp/Discord/Telegram icons appear with correct brand colors (green/indigo/blue). Drag a WhatsApp channel node onto canvas. Select it and verify ConfigPanel shows body/template_name/media_url fields.
**Expected:** 6 channel icons visible, correct accent colors, WhatsApp config fields render.
**Why human:** Visual rendering and drag-and-drop require browser testing.

### 6. Provider Settings Page — Card Grid

**Test:** Navigate to Settings > Channels. Verify 6 cards render in a 3-column grid. Toggle WhatsApp on. Enter a Discord webhook URL and save. Verify status badges update.
**Expected:** WhatsApp badge changes to "Enabled"; Discord badge changes to "Connected" after save.
**Why human:** Interactive state changes and API calls require browser with running backend.

---

## Gaps Summary

One minor gap was found:

**whatsapp.py Q_GET_SUBSCRIBER column omission:** The `Q_GET_SUBSCRIBER` constant in `apps/workers/alrt_workers/tasks/channels/whatsapp.py` (lines 25-28) selects `phone_number`, `custom_properties`, and `channel_preferences` but omits `discord_webhook_url` and `telegram_chat_id`. The plan spec required the "full column list" including all three new fields. The two omitted columns are not used by the WhatsApp delivery logic, so this does not break WhatsApp delivery. However:

1. It is inconsistent with `discord.py` and `telegram.py`, both of which select all three new columns.
2. It was specified in the plan as a requirement ("Q_GET_SUBSCRIBER: full column list including phone_number").

This is a cosmetic/consistency gap only. The core WhatsApp delivery path (`phone_number` is selected and `_normalize_phone()` runs on it), wamid storage, DLQ handling, and template fallback are all fully implemented and wired.

**All 10 requirements are satisfied.** The phase goal — expanding from 3 to 6 delivery channels — is achieved. WhatsApp, Discord, and Telegram all have substantive delivery workers, proper error handling, DLQ support, Celery routing, step_runner dispatch, dashboard UI support, and zero-setup alrt-hosted credential patterns.

---

_Verified: 2026-03-06T06:30:00Z_
_Verifier: Claude (gsd-verifier)_
