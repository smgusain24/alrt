# alrt

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

Open-source, self-hostable notification infrastructure. One API, 8 channels (in-app, email, Slack, WhatsApp, Discord, Telegram, SMS, push), visual workflow builder.

## Quick Start

```bash
git clone https://github.com/smgusain24/alrt.git
cd alrt
./setup.sh
docker compose up
```

Dashboard: `http://localhost:3000` | API: `http://localhost:8000`

## How it works

```
Your App --> POST /events/trigger --> alrt API
                                        |
                                   Workflow Engine
                                        |
              +---------+---------+---------+---------+---------+
              v         v         v         v         v         v
           In-App    Email     Slack    WhatsApp  Discord  Telegram
```

1. Sign up at `http://localhost:3000` -- creates your team + API key
2. Configure channels in Settings > Channels (add your Resend/Slack/Telegram keys)
3. Build notification workflows with the drag-and-drop builder
4. Trigger events from your app -- alrt handles routing, templating, and delivery

## Architecture

| Layer | Technology |
|-------|-----------|
| API | Python 3.12, FastAPI, asyncpg (raw SQL) |
| Workers | Celery + Redis (per-channel queues) |
| Real-time | WebSockets + Redis Pub/Sub |
| Dashboard | Next.js 14, TypeScript, Tailwind |
| Auth | JWT + API keys (`alrt_sk_` / `alrt_ck_`) |
| Database | PostgreSQL (auto-created on startup) |

## Project Structure

```
alrt/
├── apps/
│   ├── api/            # FastAPI backend
│   ├── workers/        # Celery task workers
│   └── dashboard/      # Next.js frontend
├── packages/
│   ├── sdk-node/       # TypeScript SDK
│   └── sdk-python/     # Python SDK
├── schema.sql          # Database DDL
├── docker-compose.yml  # Full stack (API + Workers + Dashboard + Postgres + Redis)
├── setup.sh            # First-time setup (generates .env with secrets)
└── .env.example        # Configuration reference
```

## Configuration

All configuration is via environment variables in `.env`. Run `./setup.sh` to generate it with random secrets.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://alrt:alrt@postgres:5432/alrt` | PostgreSQL connection |
| `REDIS_URL` | Yes | `redis://redis:6379` | Redis connection |
| `API_SECRET_KEY` | Yes | (generated) | JWT signing secret |
| `ENCRYPTION_KEY` | Yes | (generated) | Fernet key for encrypting provider credentials |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | API URL for the dashboard |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |
| `SLACK_CLIENT_ID` | No | | Your Slack app client ID |
| `SLACK_CLIENT_SECRET` | No | | Your Slack app client secret |

## Channel Setup

All channels are BYOC (Bring Your Own Credentials). Configure them in the dashboard under Settings > Channels.

| Channel | What you need |
|---------|---------------|
| Email | Resend or SendGrid API key |
| Slack | Slack app (OAuth flow in dashboard) |
| WhatsApp | Meta WABA token + phone number ID |
| Discord | Discord webhook URL |
| Telegram | Telegram bot token |
| SMS | Twilio or Kaleyra credentials |
| Push | FCM server key or APNs credentials |
| In-App | Works out of the box (WebSocket) |

## API Usage

```bash
# Sign up
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "secret", "team_name": "My Team"}'

# Trigger a notification
curl -X POST http://localhost:8000/events/trigger \
  -H "Authorization: Bearer alrt_sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "order.completed",
    "subscriber": { "id": "user-123", "email": "user@example.com" },
    "payload": { "order_id": "ORD-456", "amount": "$99.00" }
  }'
```

## SDKs

- **TypeScript**: `packages/sdk-node/` -- `npm install @alrt/node`
- **Python**: `packages/sdk-python/` -- `pip install alrt-python`

## API Docs

After starting the server, interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

## Security

For reporting vulnerabilities, see [SECURITY.md](SECURITY.md). Do not open public issues for security bugs.

## License

[MIT](LICENSE)
