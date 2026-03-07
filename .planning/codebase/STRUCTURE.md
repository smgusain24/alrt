# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
alrt/
├── apps/                       # Monorepo applications
│   ├── api/                    # FastAPI backend (Python)
│   │   └── alrt/
│   │       ├── main.py         # App entry point, lifespan, middleware, routers
│   │       ├── config.py       # Settings (env vars, CORS, rate limits)
│   │       ├── db.py           # asyncpg pool, schema init, query helpers
│   │       ├── deps.py         # Auth dependencies (JWT + API key)
│   │       ├── routes/         # API endpoints (auth, workflows, events, etc.)
│   │       ├── schemas/        # Pydantic request/response models
│   │       ├── queries/        # Raw SQL constants per table
│   │       └── middleware/     # CORS, rate limiting, audit logging
│   ├── workers/                # Celery worker (Python)
│   │   └── alrt_workers/
│   │       ├── celery_app.py   # Celery config, beat schedule
│   │       ├── db.py           # Sync DB wrapper for workers
│   │       ├── tasks/          # Celery tasks (workflow, step_runner, channels, delay)
│   │       └── utils/          # Helper utilities
│   └── dashboard/              # Next.js frontend (TypeScript)
│       └── src/
│           ├── app/            # Next.js app router (marketing + dashboard pages)
│           ├── components/     # React components (retro design, workflow, docs)
│           ├── lib/            # API client, utilities
│           └── middleware.ts   # Next.js middleware (auth redirects)
├── packages/                   # Shared packages
│   ├── sdk/                    # (Deprecated)
│   └── api-types/              # (Deprecated)
├── schema.sql                  # Database DDL (auto-run on API startup)
├── docker-compose.yml          # Local dev (Postgres + Redis)
├── pyproject.toml              # Python project config
├── package.json                # Monorepo root
├── pnpm-workspace.yaml         # pnpm workspaces config
├── turbo.json                  # Turborepo config
└── CLAUDE.md                   # Project instructions
```

## Directory Purposes

**`apps/api/alrt/`:**
- Purpose: FastAPI application
- Contains: REST API routes, database layer, auth, schemas
- Key files:
  - `main.py` - FastAPI app initialization
  - `db.py` - asyncpg helpers + schema (9 tables, auto-created)
  - `config.py` - Environment settings
  - `deps.py` - Auth dependency extractors

**`apps/api/alrt/routes/`:**
- Purpose: API endpoints grouped by resource
- Contains: 11 router files (one per feature)
- Key files:
  - `auth.py` - POST /auth/signup, /login
  - `events.py` - POST /events/trigger (main entry point)
  - `workflows.py` - CRUD + publish workflows
  - `notifications.py` - List, mark read, archive
  - `subscribers.py` - Upsert, list, delete
  - `providers.py` - Configure SendGrid/Slack
  - `websocket.py` - WebSocket upgrade, token generation

**`apps/api/alrt/queries/`:**
- Purpose: SQL query constants organized by table
- Contains: 10 Python files (one per table)
- Pattern: Each file exports query constants (CREATE, FIND_BY_ID, UPDATE, DELETE, etc.)
- Example: `workflows.py` exports `CREATE`, `FIND_BY_ID`, `FIND_BY_EVENT_NAME`, `PUBLISH`, `DELETE`

**`apps/api/alrt/schemas/`:**
- Purpose: Pydantic models for request/response validation
- Contains: 10 Python files (one per domain)
- Examples:
  - `event.py` - TriggerEvent (event trigger payload)
  - `workflow.py` - CreateWorkflow, UpdateWorkflow, WorkflowResponse
  - `subscriber.py` - SubscriberCreate, SubscriberUpdate

**`apps/api/alrt/middleware/`:**
- Purpose: Cross-cutting HTTP concerns
- Contains:
  - `rate_limit.py` - SlowAPI rate limiter setup
  - `audit_log.py` - Request/response logging middleware

**`apps/workers/alrt_workers/tasks/`:**
- Purpose: Celery task definitions
- Contains:
  - `workflow.py` - Main workflow executor (BFS graph walk)
  - `step_runner.py` - Process individual nodes (route to channels/conditions/delays)
  - `delay.py` - Poll scheduled_steps, enqueue continuations
  - `channels/` - Delivery tasks (inapp.py, email.py, slack.py)

**`apps/workers/alrt_workers/utils/`:**
- Purpose: Shared worker utilities
- Contains: Helper functions for templating, API calls, etc.

**`apps/dashboard/src/app/`:**
- Purpose: Next.js pages (routing via directory structure)
- Layout:
  - `(marketing)/` - Public pages (landing, login, signup, docs)
  - `(dashboard)/` - Authenticated pages (workflows, subscribers, analytics, logs, settings)
  - `layout.tsx` - Root layout (metadata, fonts)
- Pattern: Directory name = URL path, `page.tsx` = route handler

**`apps/dashboard/src/components/`:**
- Purpose: Reusable React components
- Contains:
  - `retro/` - Design system (RetroButton, WindowCard, Badge, etc.)
  - `workflow/` - Workflow builder (nodes, edges, config panel, palette)
  - `docs/` - API documentation components (endpoint block, params table, sidebar)

**`apps/dashboard/src/lib/`:**
- Purpose: Shared utilities
- Contains:
  - `api.ts` - Typed API client (wrapper around fetch, handles auth/redirects)

## Key File Locations

**Entry Points:**
- `apps/api/alrt/main.py` - FastAPI app, startup/shutdown hooks, router imports
- `apps/workers/alrt_workers/celery_app.py` - Celery config, task imports, beat schedule
- `apps/dashboard/src/app/layout.tsx` - Root Next.js layout

**Configuration:**
- `apps/api/alrt/config.py` - API settings (DB URL, Redis, CORS origins, rate limits)
- `apps/workers/alrt_workers/celery_app.py` - Worker settings (broker, backend, imports)
- `apps/dashboard/next.config.js` - Next.js config (TypeScript, Tailwind, etc.)

**Core Logic:**
- `apps/api/alrt/db.py` - Database pool + schema initialization
- `apps/api/alrt/deps.py` - Authentication (JWT + API key validation)
- `apps/workers/alrt_workers/tasks/workflow.py` - Workflow execution engine
- `apps/workers/alrt_workers/tasks/step_runner.py` - Node processing logic

**Testing:**
- Not heavily organized yet (files in `.claude/` and `docs/plans/`)
- Manual UAT checklist in `docs/UAT-CHECKLIST.md`

## Naming Conventions

**Files:**

- **Python modules:** `snake_case.py` (workflows.py, step_runner.py)
- **SQL queries:** `UPPERCASE_WITH_UNDERSCORES` (CREATE, FIND_BY_ID, UPDATE_LAST_USED)
- **Celery tasks:** `@celery_app.task` decorated functions in `tasks/` subdirs
- **Next.js pages:** `page.tsx` in route directories, `layout.tsx` for layouts
- **TypeScript components:** `PascalCase.tsx` (WorkflowBuilder.tsx, ChannelNode.tsx)

**Directories:**

- **Route groups (Next.js):** Parentheses format `(group-name)/` for logical grouping
- **API route directories:** Feature-based (`/routes/`, `/queries/`, `/schemas/`)
- **Worker task directories:** Feature-based (`tasks/channels/`, `tasks/` root)

**Variables & Functions:**

- **Python:** `snake_case` for functions/variables, `PascalCase` for classes
- **TypeScript:** `camelCase` for functions/variables, `PascalCase` for components/classes
- **Constants:** `UPPERCASE_WITH_UNDERSCORES` in both

## Where to Add New Code

**New Feature (e.g., SMS notifications):**
- API route: Create `apps/api/alrt/routes/sms.py` (or extend `notifications.py`)
- Schema: Add `apps/api/alrt/schemas/sms.py` or extend existing schema
- Database: Update `schema.sql`, add migration queries to `apps/api/alrt/queries/`
- Worker: Create `apps/workers/alrt_workers/tasks/channels/sms.py`
- Dashboard: Add components in `apps/dashboard/src/components/` as needed

**New API Endpoint:**
- Create handler in appropriate `apps/api/alrt/routes/` file
- Add request/response schema to `apps/api/alrt/schemas/`
- Add SQL queries to `apps/api/alrt/queries/` (if needed)
- Ensure `deps.py` dependency (`get_current_team`, `get_current_user`) is applied

**New Dashboard Page:**
- Create directory in `apps/dashboard/src/app/(dashboard)/` with `page.tsx`
- Create layout component if needed (shared sidebar, etc.)
- Use `api.ts` client for backend calls
- Import components from `apps/dashboard/src/components/retro/`

**New Utility Function:**
- Python: Add to `apps/workers/alrt_workers/utils/` or as helper in `db.py`
- TypeScript: Add to `apps/dashboard/src/lib/`

**Database Schema Changes:**
- Update `schema.sql`
- Add index to `db.py` REQUIRED_INDEXES if needed
- Schema auto-applies on next API startup (ensure_schema logic)

## Special Directories

**`schema.sql`:**
- Purpose: Complete database DDL (9 tables, pgcrypto extension)
- Generated: No (manually maintained)
- Committed: Yes
- Auto-applies: On API startup via `ensure_schema()` in `db.py`

**`docker-compose.yml`:**
- Purpose: Local development environment (PostgreSQL + Redis)
- Services: `postgres` (5432), `redis` (6379)
- Usage: `docker-compose up -d` before running API/workers

**`.claude/` and `docs/plans/`:**
- Purpose: Project documentation (PRD, progress, design docs)
- Generated: Manual, but tracked in git
- Not committed: Some temp planning files

**`.env` (root):**
- Purpose: Environment variables for development
- Exists: Yes (note: never read contents)
- Required vars: DATABASE_URL, REDIS_URL, CELERY_*, API_*, SENDGRID_*, SLACK_*

**`packages/sdk` and `packages/api-types`:**
- Status: Deprecated (API-only approach now)
- Can remove in future cleanup

---

*Structure analysis: 2026-02-28*
