# Alrt

## What This Is

Alrt (alrt.dev) is the "just works" notification infrastructure for dev teams at startups. One API key, 6 channels (in-app, email, Slack, WhatsApp, Discord, Telegram), zero external account setup. Visual workflow builder is the activation moment — drag nodes, hit save, multi-channel notifications fire. API-native, developer-first.

## Core Value

One API key replaces N integrations. A startup should be able to trigger multi-channel notifications without signing up for SendGrid, Twilio, Slack, or any provider. The workflow builder turns notification logic into a visual, ownable surface.

## Current Milestone: v1.1 — Intelligent Routing + Channel Expansion

**Goal:** Evolve from "6 channels" to "infinite channels with smart routing." Generic webhooks as the core primitive, SMS for critical transactional, intelligent routing engine (preferences + priority + fallback chains), and push notifications.

**Target features:**
- Generic outbound webhooks (core primitive — every future channel is a webhook template)
- SMS via Twilio (critical transactional: verification codes, payment alerts)
- Smart routing engine (subscriber preferences, priority-based channel selection, fallback chains with timeouts)
- Push notifications (FCM/APNs — after webhooks + SMS)
- MVP completion (activity feed, analytics, team invites — carried from v1.0)
- White-label & pricing tiers (carried from v1.0)

## Requirements

### Validated

- ✓ Multi-channel notification trigger via single REST API call — v1.0
- ✓ In-app channel: headless API + WebSocket real-time delivery — v1.0
- ✓ Email channel: alrt-hosted (Resend) + BYOC fallback — v1.0
- ✓ Slack channel: alrt-hosted OAuth app + BYOC fallback — v1.0
- ✓ WhatsApp channel: Meta Cloud API via alrt WABA, delivery status tracking — v1.0
- ✓ Discord channel: webhook-based embeds, subscriber or team-level URLs — v1.0
- ✓ Telegram channel: Bot API, shared bot token, Markdown support — v1.0
- ✓ Visual workflow builder: trigger, channel (6 types), condition (8 operators), delay nodes — v1.0
- ✓ Subscriber management with per-channel preferences, DND, frequency caps — v1.0
- ✓ Template management API (CRUD, preview, channel node references) — v1.0
- ✓ Dead letter queue with one-click retry — v1.0
- ✓ Inline subscriber upsert on trigger + deliver_at scheduling + metadata tagging — v1.0
- ✓ Bulk trigger (up to 1000 subscribers per call) — v1.0
- ✓ Atomic idempotency (SET NX) — v1.0
- ✓ Channel-specific Celery queues (email/slack/inapp/whatsapp/discord/telegram) — v1.0
- ✓ Notification retention archival (90-day policy) — v1.0
- ✓ Per-team sending quotas on shared infrastructure — v1.0
- ✓ Workflow graph validation (cycle detection, dangling edges) — v1.0
- ✓ Multi-tenant: team-scoped API keys + JWT auth — v1.0

### Active

See `.planning/REQUIREMENTS.md` for full v1.1 requirements with REQ-IDs.

### Out of Scope

- Pre-built notification UI components — alrt is headless; clients build their own UI
- Digest/batching logic — future milestone
- Advanced analytics (open rates, A/B testing, link tracking) — future milestone
- Self-hosted / on-prem — not a priority for startup market
- Marketing automation / drip campaigns — different product category
- CRM / user segmentation — out of product scope
- PagerDuty/OpsGenie native integration — served by generic webhooks
- Linear/Jira/GitHub native integration — served by generic webhooks

## Context

**Current state (v1.0 complete):** 6 channels live (in-app, email, Slack, WhatsApp, Discord, Telegram). Shared infrastructure for email (Resend) and Slack (OAuth app). Templates, DLQ, preferences, bulk trigger, retention — all production-ready. Dashboard has workflow builder, subscribers, settings, providers pages.

**Positioning:** "API that has a UI" — Stripe-for-notifications. Competitors (Novu, Knock, Courier) feel like marketing tools that added APIs. ALRT is infrastructure-first with a visual builder as the activation moment.

**ICP:** Dev teams at startups building product notifications (onboarding, transactional, activity). Pain: building notification infra from scratch sucks.

**Competitive moat:** DX — best docs, fastest integration, most intuitive API. The workflow builder is what makes ALRT different from raw API-only solutions, while the API-native architecture is what differentiates from GUI-first competitors.

**Architecture direction:** Webhooks as core channel primitive. Existing 6 channels stay native (optimized retry, status tracking). New channels default to webhook-based. Power users can override any channel with custom webhook config. This is the "hybrid" model.

**Technical state:** See `.planning/codebase/` for full codebase analysis.

## Constraints

- **Tech stack:** Python + FastAPI + Celery + asyncpg + Next.js 14 — locked, no rearchitecting
- **Scale:** Startup-grade (<10k events/day) for now; architecture handles this fine
- **Monorepo:** Turborepo + pnpm — keep monorepo structure
- **Channel architecture:** Hybrid model — native channels for built-ins, webhook-based for new/custom channels

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full-stack infra, not BYOC | Clients want one API key, not 5 accounts | ✓ Good (shipped v1.0) |
| In-app is headless API only | Zero lock-in, any frontend stack | ✓ Good |
| Python + FastAPI + Celery | Async perf, battle-tested queue, auto OpenAPI | ✓ Good |
| Raw SQL + asyncpg | Full JSONB control, no ORM overhead | ✓ Good |
| No SDK in MVP | API + docs sufficient | ✓ Good |
| Webhooks as core channel primitive | Infinite channels without native integrations; hybrid model | — Pending (v1.1) |
| Smart routing over more channels | Fewer channels, smarter delivery (preferences, priority, fallback) | — Pending (v1.1) |
| DX as competitive moat | Best docs, fastest time-to-first-notification, API design excellence | — Active |
| Workflow builder as activation moment | Visual builder IS the product differentiator, not just a feature | ✓ Good |
| Pricing tied to white-label depth | Aligns value with price | — Pending (v1.1) |

---
*Last updated: 2026-03-06 after v1.0 completion + v1.1 milestone start*
