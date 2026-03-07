# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Email Providers:**
- SendGrid - Transactional email delivery
  - SDK/Client: httpx (raw HTTP POST to `https://api.sendgrid.com/v3/mail/send`)
  - Auth: API key in provider config, stored encrypted
  - Location: `apps/workers/alrt_workers/tasks/channels/email.py`

- Resend - Alternative email service
  - SDK/Client: httpx (raw HTTP POST to `https://api.resend.com/emails`)
  - Auth: API key in provider config, stored encrypted
  - Location: `apps/workers/alrt_workers/tasks/channels/email.py`

**Chat/Messaging:**
- Slack - Bot messaging and OAuth integration
  - SDK/Client: httpx (raw HTTP POST to `https://slack.com/api/chat.postMessage`)
  - OAuth: `https://slack.com/oauth/v2/authorize` for initial connection
  - Token exchange: `https://slack.com/api/oauth.v2.access`
  - Auth: Bot token stored encrypted in provider config
  - Location: `apps/api/alrt/routes/providers.py` (OAuth routes), `apps/workers/alrt_workers/tasks/channels/slack.py` (delivery)

## Data Storage

**Primary Database:**
- PostgreSQL 16
  - Connection: via `DATABASE_URL` environment variable (asyncpg driver)
  - Format: `postgresql+asyncpg://user:pass@host:5432/alrt`
  - Client: asyncpg 0.30+ (async, no ORM)
  - Pool config: min_size=2, max_size=10
  - JSONB support enabled with custom codec for auto-serialization

**Message Queue & Broker:**
- Redis 7
  - Connection: via `REDIS_URL` environment variable
  - Format: `redis://localhost:6379`
  - Role: Celery broker (task queue) + Celery result backend
  - Alternative config via `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` (default to REDIS_URL)

**File Storage:**
- Local filesystem only - No cloud storage integration (files stored in database as JSONB)
- Database stores: provider configs, workflow definitions, event payloads, custom properties

**Caching:**
- Redis - Used for Celery task state and message brokering only (no explicit cache layer)

## Authentication & Identity

**Dashboard Auth:**
- Custom JWT-based (email/password)
  - Implementation: `apps/api/alrt/routes/auth.py`
  - Hashing: bcrypt 4.0+ for password storage
  - Token creation: python-jose 3.3+ with HS256 algorithm
  - Expiry: 24 hours
  - Storage: HttpOnly cookies (set by response headers)
  - Payload: `user_id`, `team_id`, `email`, `exp`

**API Auth:**
- Dual method (JWT or API Key)
  - JWT: Same as dashboard (decoded from Authorization header)
  - API Key: SHA-256 hashed keys with `alrt_sk_` (server) or `alrt_ck_` (client) prefix
  - Implementation: `apps/api/alrt/deps.py` - `get_current_team()`
  - Key lookup: Hash-based lookup in `api_keys` table
  - Last used tracking: Updated on each use

**Subscriber Auth:**
- Subscriber-scoped JWT for WebSocket connections
  - Route: `POST /subscribers/:id/token`
  - Implementation: `apps/api/alrt/routes/websocket.py`
  - Purpose: WebSocket authentication for in-app notifications

**Third-party OAuth:**
- Slack OAuth 2.0
  - Client ID/Secret: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` env vars
  - Redirect URI: `SLACK_REDIRECT_URI` (default: `http://localhost:8000/providers/slack/callback`)
  - Flow: User initiates at `/providers/slack/connect`, redirected to Slack, callback exchanges code for token

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Application logs to stdout (Python logging module)
- Event audit logs stored in `event_logs` table:
  - Captured via AuditLogMiddleware in `apps/api/alrt/middleware/audit_log.py`
  - Records: method, path, status_code, latency_ms, request_body (JSONB), response_summary (JSONB), ip_address, user_agent
  - Queryable via `/logs` endpoint

**Structured Logging:**
- Python logging module with getLogger("alrt.*") patterns
- No external log aggregation service

## CI/CD & Deployment

**Hosting:**
- Railway.io (configured via `railway.toml` in api and workers directories)
- Supports standalone Postgres and Redis deployment

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar configuration files

**Docker:**
- Dockerfile present in `apps/workers/` for containerization
- Docker Compose for local development (Postgres 16 + Redis 7)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection string (required)
- `API_SECRET_KEY` - Secret for JWT signing (required)
- `ENCRYPTION_KEY` - Fernet key for encrypting provider credentials (required, must be base64-encoded Fernet key)
- `CORS_ORIGINS` - Comma-separated list of allowed origins (default: `http://localhost:3000`)

**Optional env vars:**
- `SLACK_CLIENT_ID` - For Slack OAuth integration
- `SLACK_CLIENT_SECRET` - For Slack OAuth integration
- `SLACK_REDIRECT_URI` - Slack OAuth callback (default: `http://localhost:8000/providers/slack/callback`)
- `DASHBOARD_URL` - Frontend URL (default: `http://localhost:3000`)
- `RATE_LIMIT_WRITE` - Write rate limit (default: `60/minute`)
- `RATE_LIMIT_READ` - Read rate limit (default: `120/minute`)
- `RATE_LIMIT_PUBLIC` - Public endpoint rate limit (default: `30/minute`)
- `NEXT_PUBLIC_STRICT_MODE` - React strict mode toggle (frontend)

**Secrets location:**
- `.env` file in project root (loaded by both API and workers via `pydantic-settings`)
- Provider credentials encrypted with Fernet and stored in `providers.config` (JSONB column)
- API key hashes stored in `api_keys.key_hash` (SHA-256)

## Webhooks & Callbacks

**Incoming:**
- Slack OAuth callback: `GET /providers/slack/callback`
- Event trigger: `POST /events/:event_name` - Receives event payload and triggers workflow execution

**Outgoing:**
- Slack API: `chat.postMessage` (via webhooks/bot token)
- SendGrid API: `POST https://api.sendgrid.com/v3/mail/send`
- Resend API: `POST https://api.resend.com/emails`
- WebSocket Pub/Sub via Redis: Real-time in-app notification delivery to connected subscribers
  - Channel pattern: `{workflow_execution_id}` for Redis Pub/Sub topic subscription

## Celery Task Integration

**Task Distribution:**
- Broker: Redis (configurable via `CELERY_BROKER_URL`)
- Result Backend: Redis (configurable via `CELERY_RESULT_BACKEND`)
- Serialization: JSON only
- Task acks: Late-acked (processed before removal from queue)
- Worker prefetch: 1 (one task per worker at a time)

**Scheduled Tasks:**
- Celery Beat scheduler integrated
- `poll-scheduled-steps` task runs every 30 seconds to pick up delayed notifications
- Implementation: `apps/workers/alrt_workers/tasks/delay.py`

**Channel Delivery Tasks:**
- `alrt_workers.tasks.channels.inapp.deliver` - In-app notification (database + Pub/Sub)
- `alrt_workers.tasks.channels.email.deliver` - Email delivery (SendGrid/Resend)
- `alrt_workers.tasks.channels.slack.deliver` - Slack messaging
- Retry logic: Exponential backoff with different configs per channel
- Non-retriable errors tracked and failed gracefully (e.g., invalid Slack tokens)

---

*Integration audit: 2026-02-28*
