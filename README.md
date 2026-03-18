# Alrt

Multi-channel notifications infrastructure for startups. Send in-app, email, and Slack notifications through a single API with a visual workflow builder.

## How it works

```
Your App → POST /events/trigger → Alrt API
                                      │
                                 Workflow Engine
                                      │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
                       In-App      Email       Slack
```

1. Define notification workflows with a drag-and-drop builder
2. Register subscribers via API
3. Trigger events from your app — Alrt handles routing, templating, and delivery

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Python 3.12, FastAPI, asyncpg (raw SQL) |
| Workers | Celery + Redis |
| Real-time | WebSockets + Redis Pub/Sub |
| Dashboard | Next.js 14, TypeScript, Tailwind |
| Auth | JWT + API keys (`alrt_sk_` / `alrt_ck_`) |

## Project Structure

```
alrt/
├── apps/
│   ├── api/            # FastAPI backend
│   ├── workers/        # Celery task workers
│   └── dashboard/      # Next.js frontend
├── schema.sql          # Database DDL
└── docker-compose.yml  # Local Postgres + Redis
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for Postgres + Redis)

### Local Development

```bash
# Start Postgres and Redis
docker-compose up -d

# API (auto-creates database tables on startup)
cd apps/api
uv sync
uv run uvicorn alrt.main:app --reload

# Workers
cd apps/workers
uv sync
uv run celery -A alrt_workers.celery_app worker --loglevel=debug

# Dashboard
cd apps/dashboard
pnpm install
pnpm dev
```

The API runs at `http://localhost:8000`, dashboard at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/alrt
REDIS_URL=redis://localhost:6379
API_SECRET_KEY=<your-secret-key>
ENCRYPTION_KEY=<generate-with-fernet>
```

## API Usage

### Authentication

```bash
# Sign up (returns JWT in cookie)
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "...", "name": "Your Name"}'

# Use API key for server-to-server calls
curl http://localhost:8000/events/trigger \
  -H "Authorization: Bearer alrt_sk_..."
```

### Trigger a Notification

```bash
curl -X POST http://localhost:8000/events/trigger \
  -H "Authorization: Bearer alrt_sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "order.completed",
    "subscriber_id": "user-123",
    "payload": {
      "order_id": "ORD-456",
      "amount": "$99.00"
    }
  }'
```

## Deployment

Deployable on [Railway](https://railway.com) as three services (API, Workers, Dashboard) with managed Postgres and Redis.

## License

MIT
