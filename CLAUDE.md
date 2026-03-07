# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alrt (alrt.dev) is the "just works" notification infrastructure for dev teams at startups. One API key, 6 channels (in-app, email, Slack, WhatsApp, Discord, Telegram), zero external account setup. Visual workflow builder lets product teams own notification logic. API-native, developer-first.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Python 3.12 + FastAPI (async) |
| Database | PostgreSQL (asyncpg, raw SQL — no ORM) |
| Task Queue | Celery + Redis (broker + result backend) |
| Cache/Broker | Redis |
| Real-time | FastAPI native WebSockets + Redis Pub/Sub |
| Dashboard | Next.js 14 + TypeScript + Tailwind |
| Auth | JWT (bcrypt + python-jose) — email/password |
| Monorepo | Turborepo |

## Monorepo Structure

```
alrt/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   └── alrt/
│   │       ├── db.py         # asyncpg pool + helpers (execute_read, execute_insert, etc.)
│   │       ├── queries/      # Raw SQL constants per table (users.py, teams.py, etc.)
│   │       ├── routes/       # API routes (auth, events, subscribers, workflows, etc.)
│   │       ├── schemas/      # Pydantic request/response models
│   │       ├── deps.py       # Auth dependencies (JWT + API key)
│   │       ├── config.py     # Settings
│   │       └── main.py       # App entry (lifespan, CORS, routers)
│   ├── workers/              # Celery workers
│   │   └── alrt_workers/
│   │       ├── db.py         # Sync DB wrapper for workers
│   │       └── tasks/        # workflow, step_runner, channels/*, delay
│   └── dashboard/            # Next.js frontend
│       └── src/
│           ├── app/
│           │   ├── (marketing)/  # Landing page, docs, login, signup
│           │   └── (dashboard)/  # Authenticated pages (workflows, subscribers, settings)
│           ├── components/
│           │   ├── retro/    # Shared retro design system components
│           │   └── docs/     # API docs components
│           └── lib/
│               └── api.ts    # Typed API client with cookie auth
├── packages/
│   ├── sdk/                  # (Deprecated — API-only approach)
│   └── api-types/            # (Deprecated — docs page sufficient)
├── schema.sql                # Database DDL (9 tables, auto-run on startup)
├── docker-compose.yml        # Local dev (Postgres + Redis)
└── turbo.json
```

## Architecture

```
Client App → REST API (Bearer token) → FastAPI
                                            │
                                  ┌─────────┼──────────┐
                                  ▼         ▼          ▼
                               Postgres   Redis     Redis Pub/Sub
                              (asyncpg)  (Celery     (WS fanout)
                                          broker)
                                            │
                                       Celery Workers
                                            │
                        ┌────────┬────────┬────────┬────────┬────────┬────────┐
                        ▼        ▼        ▼        ▼        ▼        ▼        ▼
                     In-App   Email    Slack   WhatsApp  Discord  Telegram  (Webhook)
                    (DB+WS) (Resend)  (OAuth)  (Meta)   (Embed)  (Bot API)  (v1.1)
```

**Database approach:** Raw SQL with asyncpg. No ORM. Query files in `apps/api/alrt/queries/`. Helper functions in `db.py`. Schema auto-created on startup via `ensure_schema()`.

**Auth:** Two methods supported:
- **JWT** (dashboard) — email/password signup/login, token in cookie
- **API keys** (external) — `alrt_sk_` (server, full access) / `alrt_ck_` (client, read-only), SHA-256 hashed

**Celery task hierarchy:** `workflow.execute` → `step_runner.execute_step` → `channels.{inapp,email,slack,whatsapp,discord,telegram}.deliver`

**Channel queues:** Each channel has a dedicated Celery queue (email, slack, inapp, whatsapp, discord, telegram) — prevents one channel's load from blocking others.

**Sending model:** alrt-hosted by default (email via Resend, Slack via alrt OAuth app, WhatsApp via alrt WABA, Telegram via shared bot). BYOC available for email/Slack. Per-team quotas tracked.

**Key design decisions:**
- Event-to-workflow mapping is 1:1 (one event name → one workflow)
- Trigger API supports inline subscriber upsert, deliver_at scheduling, metadata, bulk (up to 1000)
- Delay nodes persist to `scheduled_steps` table + Celery Beat polls every 30s
- WebSocket auth uses subscriber-scoped JWTs (`POST /subscribers/:id/token`)
- Templates are first-class API resources; channel nodes reference template IDs
- Dead letter queue for permanently failed notifications with retry API

## Local Development

```bash
docker-compose up -d                    # Postgres + Redis
cd apps/api && uvicorn alrt.main:app --reload    # API (auto-creates tables)
cd apps/workers && celery -A alrt_workers.celery_app worker --loglevel=info
cd apps/dashboard && npm run dev        # Dashboard at localhost:3000
```

## API Authentication

**Dashboard auth:** `POST /auth/signup` → creates User + Team + API key → JWT in cookie
**API auth:** `Authorization: Bearer <alrt_sk_...>` or `Authorization: Bearer <jwt_token>`

## Key Documentation

- `.planning/PROJECT.md` — Living project context (goals, decisions, constraints)
- `.planning/ROADMAP.md` — Phase-based execution roadmap
- `.planning/REQUIREMENTS.md` — Requirements with REQ-IDs and traceability
- `.planning/STATE.md` — Current execution state
- `.claude/alrt-mvp-prd.md` — Original MVP PRD
- `.claude/alrt-product-vision-strategy.md` — Strategy + competitive analysis
- `docs/plans/` — Design documents for features
