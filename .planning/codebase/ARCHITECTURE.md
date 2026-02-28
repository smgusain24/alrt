# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Multi-tier distributed system with async request-response (API) and async task-queue processing (Celery).

**Key Characteristics:**
- **Event-driven workflow execution** - Events trigger workflows asynchronously via Redis-based Celery
- **Raw SQL with asyncpg** - No ORM; query functions in dedicated `queries/` modules
- **Dual authentication** - JWT (dashboard) + API keys (external clients)
- **Multi-channel routing** - Single trigger → In-app, Email, Slack delivery
- **Real-time WebSocket support** - In-app notifications pushed via Redis Pub/Sub

## Layers

**Presentation (Frontend):**
- Purpose: Dashboard UI for workflow builder, subscribers, analytics; marketing landing page
- Location: `apps/dashboard/src/app/`
- Contains: Next.js 14 pages, components (retro design system), API client
- Depends on: FastAPI REST endpoints, WebSocket for real-time notifications
- Used by: End users (SaaS dashboard), startups (landing page)

**API (Request Layer):**
- Purpose: HTTP REST endpoints for authentication, workflows, events, subscribers, analytics
- Location: `apps/api/alrt/routes/`
- Contains: FastAPI routers (auth.py, events.py, workflows.py, notifications.py, subscribers.py, teams.py, providers.py, analytics.py, logs.py, websocket.py)
- Depends on: Database (asyncpg), Redis (idempotency, Pub/Sub), Celery (task enqueue)
- Used by: Dashboard frontend, external API clients, WebSocket subscribers

**Data Access (Query Layer):**
- Purpose: Parameterized SQL queries organized by table, with helper functions for execution
- Location: `apps/api/alrt/queries/` (workflows.py, users.py, subscribers.py, notifications.py, etc.)
- Contains: Raw SQL constants per table, returning query strings
- Depends on: asyncpg connection pool via `db.py` helpers
- Used by: Route handlers

**Database Layer:**
- Purpose: Connection pooling, schema initialization, JSONB codec setup, query execution helpers
- Location: `apps/api/alrt/db.py`
- Contains: `init_pool()`, `ensure_schema()`, `execute_read_query()`, `execute_insert_query()`, `execute_update_query()`, `execute_delete_query()`
- Depends on: asyncpg, PostgreSQL server
- Used by: All route handlers and Celery workers

**Task Queue (Async Processing):**
- Purpose: Asynchronous workflow execution, step routing, channel delivery, scheduled job polling
- Location: `apps/workers/alrt_workers/tasks/` (workflow.py, step_runner.py, channels/*, delay.py)
- Contains: Celery tasks for workflow execution, step handling, in-app/email/Slack delivery
- Depends on: Redis (broker + result backend), PostgreSQL (worker DB), external APIs (SendGrid, Slack)
- Used by: Event trigger API, Celery Beat scheduler

**Middleware & Cross-Cutting:**
- Purpose: Rate limiting, audit logging, CORS, error handling
- Location: `apps/api/alrt/middleware/`
- Contains: rate_limit.py (SlowAPI), audit_log.py
- Depends on: FastAPI, Redis
- Used by: Main FastAPI app

## Data Flow

**Event Trigger → Notification Delivery:**

1. Client calls `POST /events/trigger` with workflow name, subscriber ID, payload
2. API validates workflow exists and is published; checks idempotency key (Redis cache)
3. Creates `workflow_executions` row, stores idempotency key in Redis (24h TTL)
4. Enqueues Celery task `workflow.execute` via Redis message to `celery` list (Celery v2 protocol)
5. Worker picks up task: fetches execution, workflow definition, subscriber
6. Worker performs BFS walk through workflow nodes (trigger → channels → conditions → delays)
7. For each step, enqueues `step_runner.execute_step` task
8. Step runner determines node type:
   - **channel node**: Routes to `channels.{inapp|email|slack}.deliver` based on channel
   - **delay node**: Creates `scheduled_steps` record, sets status to pending
   - **condition node**: Evaluates payload against condition logic, skips branch if false
9. Channel delivery tasks:
   - **in-app**: Inserts notification record, publishes to Redis Pub/Sub (WS subscribers)
   - **email**: Calls SendGrid/Resend API with rendered template
   - **Slack**: Calls Slack API with message payload
10. All notifications stored in `notifications` table with status (pending/sent/failed/read)
11. WebSocket clients subscribe to Redis Pub/Sub, receive real-time in-app notifications

**Workflow Definition Structure:**

- `workflows.definition` is JSONB with `{ "nodes": [...], "edges": [...] }`
- Nodes: `{ id, type: "trigger" | "channel" | "condition" | "delay", data: { ... } }`
- Edges: `{ source, target }` (directed acyclic graph for branching)

**Team/Multi-Tenancy:**

- All queries filter by `team_id` (e.g., `WHERE team_id = $1`)
- JWT and API keys scoped to single team
- Idempotency keys isolated per team

## Key Abstractions

**Workflow Execution Model:**

- Purpose: Represents one event trigger → one subscriber routing through workflow
- Examples: `apps/api/alrt/db.py` (schema), `apps/workers/alrt_workers/tasks/workflow.py` (executor)
- Pattern:
  - One `workflow_executions` record tracks overall status
  - Multiple `notifications` records created (one per channel)
  - BFS graph walk processes nodes sequentially per branch

**Channel Abstraction:**

- Purpose: Decouple notification delivery from workflow logic
- Examples: `apps/workers/alrt_workers/tasks/channels/inapp.py`, `email.py`, `slack.py`
- Pattern: Each channel task receives execution context, formats content, delivers

**Scheduled Execution:**

- Purpose: Support delay nodes (wait X minutes/hours, then continue)
- Implementation: `scheduled_steps` table + Celery Beat (polls every 30s)
- Pattern: Delay node creates `scheduled_steps` row; poller enqueues continuation task when due

**Idempotency:**

- Purpose: Prevent duplicate event processing on retries
- Implementation: Redis cache `idempotency:{team_id}:{key}` with 24h TTL
- Pattern: On trigger, check cache; if exists, return cached execution_id; else create + cache

## Entry Points

**API Server:**
- Location: `apps/api/alrt/main.py`
- Triggers: `uvicorn alrt.main:app --reload`
- Responsibilities:
  - Initialize asyncpg pool + schema on startup
  - Register CORS, rate limiting, audit log middleware
  - Mount routers (auth, workflows, events, notifications, subscribers, teams, providers, analytics, logs, websocket)
  - Serve health endpoint

**Celery Worker:**
- Location: `apps/workers/alrt_workers/celery_app.py`
- Triggers: `celery -A alrt_workers.celery_app worker --loglevel=info`
- Responsibilities:
  - Connect to Redis broker/backend
  - Import task modules (workflow, step_runner, channels, delay)
  - Process enqueued tasks with up to 3 retries

**Celery Beat:**
- Location: `apps/workers/alrt_workers/celery_app.py` (beat_schedule config)
- Triggers: `celery -A alrt_workers.celery_app beat`
- Responsibilities: Every 30 seconds, enqueue `delay.poll_scheduled_steps` to process due delays

**Dashboard Frontend:**
- Location: `apps/dashboard/src/app/page.tsx` (landing), `app/(dashboard)/` (authenticated)
- Triggers: `npm run dev` → Next.js dev server at localhost:3000
- Responsibilities:
  - Marketing landing page (hero, features, pricing)
  - Authenticated dashboard (workflows builder, subscribers, analytics)
  - Cookie-based JWT session (set by auth login)

## Error Handling

**Strategy:** Graceful degradation with logging and optional retries.

**Patterns:**

- **Async exceptions (API):** HTTPException caught by FastAPI, return JSON error with status code
- **Task retries (Celery):** `@celery_app.task(bind=True, max_retries=3)` on critical tasks (workflow.execute); exponential backoff
- **Query failures:** Execute functions return `None` or empty list; caller checks and raises HTTPException
- **External API failures:** SendGrid/Slack errors logged, notification marked `failed` with `error_reason`
- **Database errors:** Logged with `exc_info=True`; worker tasks return without crashing

## Cross-Cutting Concerns

**Logging:**
- Framework: Python `logging` module
- Pattern: Logger per module (e.g., `logger = logging.getLogger("alrt.db")`)
- Channels: Console output; Celery workers include task ID

**Validation:**
- Framework: Pydantic (FastAPI schemas)
- Pattern: Request bodies validated by schema classes (TriggerEvent, CreateWorkflow, etc.)
- Workflow validation: Trigger nodes required, max 10 steps, channels must exist in definition

**Authentication:**
- Strategy: Dual-path in `deps.py`
  - JWT from cookie → decode, extract user_id/team_id
  - API key from Authorization header → SHA-256 hash lookup in api_keys table, update last_used_at
- Pattern: `Security(security)` dependency injection in route handlers
- Scope: All routes require auth except POST /auth/signup, POST /auth/login, GET /health

**Authorization:**
- Strategy: Team-scoped (implicit via team_id in JWT/API key)
- Pattern: Queries filter by team_id; no explicit role-based access control yet
- Subscribers: Per-workflow, per-channel preferences stored in `channel_preferences` JSONB

---

*Architecture analysis: 2026-02-28*
