---
phase: 04-new-channels-whatsapp-discord-telegram
plan: 02
subsystem: workers
tags: [discord, telegram, celery, webhooks, bot-api, notifications]
dependency_graph:
  requires:
    - 04-01  # retry policies, Celery routing, step_runner dispatch
  provides:
    - Discord webhook delivery worker
    - Telegram Bot API delivery worker
  affects:
    - apps/workers/alrt_workers/tasks/channels/discord.py
    - apps/workers/alrt_workers/tasks/channels/telegram.py
tech_stack:
  added:
    - httpx (synchronous HTTP calls to Discord webhooks and Telegram Bot API)
  patterns:
    - Same deliver() signature as email.py and slack.py workers
    - DLQ pattern for permanent HTTP errors (PERMANENT_HTTP_CODES constant)
    - Quota increment after Q_MARK_SENT (fire-and-forget)
    - Template resolution via template_id with inline fallback
key_files:
  created:
    - apps/workers/alrt_workers/tasks/channels/discord.py
    - apps/workers/alrt_workers/tasks/channels/telegram.py
  modified: []
decisions:
  - Discord webhook URL resolved from subscriber first, then team provider fallback (BYOC or alrt_hosted)
  - Discord alrt_hosted provider config is encrypted (unlike email alrt_hosted which stores display_name plaintext)
  - Discord embed color: hex string converted to int via int(hex.lstrip('#'), 16); default blue 0x3b82f6
  - embed_enabled=False sends plain content (2000 char limit) instead of rich embed
  - Telegram uses shared TELEGRAM_BOT_TOKEN env var — no per-team credentials needed
  - Legacy Markdown parse mode chosen over MarkdownV2 (forgiving, no escape complexity)
  - _TelegramRateLimited exception carries retry_after attribute; deliver() uses it as countdown
  - Telegram title stored as None in notifications (no subject/title concept in Telegram)
metrics:
  duration_minutes: 2
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
  completed_date: "2026-03-06"
---

# Phase 04 Plan 02: Discord and Telegram Channel Workers Summary

Discord and Telegram channel delivery workers using synchronous HTTP (httpx), following the established email/slack worker pattern exactly.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Discord webhook delivery worker | 3153f75 | apps/workers/alrt_workers/tasks/channels/discord.py |
| 2 | Telegram Bot API delivery worker | c03b265 | apps/workers/alrt_workers/tasks/channels/telegram.py |

---

## What Was Built

### Discord Worker (discord.py)

The Discord channel worker delivers notifications to Discord webhooks. Key behaviors:

- **Webhook URL resolution:** Subscriber-level `discord_webhook_url` takes priority; falls back to team provider (BYOC or alrt_hosted, both encrypted)
- **Rich embeds:** Builds embed dict with `title[:256]`, `description[:4096]`, `color` (int from hex), optional `footer[:2048]`, optional ISO 8601 `timestamp`
- **Plain content mode:** When `embed_enabled=False`, sends `{"content": description[:2000]}` instead of embeds
- **Permanent errors:** HTTP 400/401/403/404 → DLQ immediately (404 = webhook deleted/invalid)
- **Retry:** DISCORD_RETRY (3 retries, 10s base, backoff to 600s)
- **Quota:** Team quota incremented after `Q_MARK_SENT` (fire-and-forget)

### Telegram Worker (telegram.py)

The Telegram channel worker delivers notifications via the Telegram Bot API. Key behaviors:

- **Bot token:** Shared `TELEGRAM_BOT_TOKEN` env var — no per-team credentials (platform-level token)
- **Chat ID:** Subscriber's `telegram_chat_id` field used as delivery target
- **Text limit:** Messages truncated to 4096 chars (Telegram hard limit)
- **Parse mode:** Legacy `Markdown` by default (configurable via `template_data.parse_mode`) — avoids MarkdownV2 escape complexity
- **Rate limiting:** HTTP 429 extracts `parameters.retry_after` from response body → `_TelegramRateLimited` exception → `self.retry(countdown=retry_after)` — respects API's backoff requirement
- **Permanent errors:** HTTP 400/401/403 → DLQ immediately
- **Application errors:** `ok=false` in response body raises `RuntimeError` with Telegram's error description
- **Quota:** Team quota incremented after `Q_MARK_SENT` (fire-and-forget)

---

## Decisions Made

1. **Discord alrt_hosted config is encrypted** — Unlike email alrt_hosted which stores only `display_name` (non-secret), Discord webhook URLs are treated as secrets (leaked URL = anyone can post to channel). Config uses Fernet encryption same as Slack.

2. **Telegram shared bot token** — Discord uses per-subscriber (or per-team) webhook URLs; Telegram uses one platform bot token for all teams. This is intentional: Telegram's model is one bot per application, not per customer.

3. **Legacy Markdown over MarkdownV2** — MarkdownV2 requires escaping nearly all punctuation (`_`, `*`, `[`, `]`, `(`, `)`, etc.). Using legacy Markdown means user content passes through without mangling.

4. **`_TelegramRateLimited` as explicit exception class** — Rather than detecting 429 inside the general `except Exception` block, the rate limit case is extracted into a dedicated exception with `retry_after` as an attribute. This makes the countdown retry path clean and avoids re-parsing the response body in the outer handler.

5. **Discord `embed_enabled=False` sends plain content** — Some workflow use cases prefer plain Discord messages (no embed box). The `embed_enabled` field in `template_data` controls this without requiring a separate channel type.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/workers/alrt_workers/tasks/channels/discord.py | FOUND |
| apps/workers/alrt_workers/tasks/channels/telegram.py | FOUND |
| .planning/phases/04-new-channels-whatsapp-discord-telegram/04-02-SUMMARY.md | FOUND |
| commit 3153f75 (Discord worker) | FOUND |
| commit c03b265 (Telegram worker) | FOUND |
