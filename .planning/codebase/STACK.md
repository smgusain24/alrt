# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- Python 3.12 - Backend API and async workers
- TypeScript 5.x - Frontend dashboard with React
- SQL (PostgreSQL) - Database queries

**Secondary:**
- JavaScript/JSX - Next.js configuration and scripts

## Runtime

**Environment:**
- Python 3.12+ (asyncpg runtime)
- Node.js (via pnpm) - Frontend build and development
- PostgreSQL 16 - Primary database
- Redis 7 - Broker and result backend

**Package Manager:**
- pnpm 9.15.4 - Node.js monorepo package manager
- uv (Python) - Fast Python package installer and lock manager
- Hatchling - Python build backend

**Lockfiles:**
- `pnpm-lock.yaml` - Node.js dependencies (pnpm workspace)
- `uv.lock` - Python dependencies

## Frameworks

**API & Async:**
- FastAPI 0.115+ - Python async REST API framework
- uvicorn 0.34+ - ASGI server with standard extras
- Pydantic 2.7+ - Data validation and settings management
- asyncpg 0.30+ - Async PostgreSQL driver (no ORM)

**Frontend:**
- Next.js 14 - React framework with app router
- React 18 - UI library
- Tailwind CSS 3 - Utility-first CSS framework

**Task Queue:**
- Celery 5.4+ (with Redis) - Distributed task queue for async jobs
- Celery Beat - Periodic task scheduler (polls scheduled_steps every 30s)

**Testing:**
- pytest 8.0+ - Python test runner
- pytest-asyncio 0.24+ - Async test support
- httpx 0.27+ - Async HTTP client for tests

## Key Dependencies

**Critical:**
- asyncpg 0.30+ - Async database queries without ORM (uses raw SQL + asyncpg pool)
- redis 5.2+ - Redis client for Celery broker and caching
- Celery 5.4+ - Task queue for workflow execution and channel delivery
- FastAPI 0.115+ - REST API framework with dependency injection
- python-jose 3.3+ with cryptography - JWT token generation and validation
- bcrypt 4.0+ - Password hashing for user authentication
- cryptography 44+ - Fernet encryption for provider credentials storage

**Infrastructure:**
- jinja2 3.1+ - Template rendering for email/Slack message bodies
- httpx 0.27+ - HTTP client for external API calls (Slack, SendGrid, Resend)
- slowapi 0.1.9+ - Rate limiting middleware for FastAPI
- pydantic-settings 2.7+ - Environment-based configuration loading

**Frontend:**
- lucide-react - Icon library
- react-fast-marquee - Marquee/scrolling text component
- reactflow 11.11+ - Visual workflow builder for dashboard
- recharts 3.7+ - Charting library for analytics

## Configuration

**Environment:**
- Loaded from `.env` file in root and app directories
- pydantic-settings handles env var mapping
- Key configs: `DATABASE_URL`, `REDIS_URL`, `API_SECRET_KEY`, `ENCRYPTION_KEY`, Slack OAuth credentials

**Build:**
- `pyproject.toml` - Python workspace (apps/api and apps/workers)
- `package.json` - Node.js monorepo with Turbo
- `turbo.json` - Monorepo task orchestration
- `pnpm-workspace.yaml` - pnpm workspaces configuration
- `.ruff` config in `pyproject.toml` (Python formatting, target Python 3.12, 120-char line length)

**Development:**
- Docker Compose - Local stack with Postgres 16 and Redis 7
- Next.js dev server on port 3000
- FastAPI uvicorn on port 8000
- Redis on port 6379
- PostgreSQL on port 5432

## Platform Requirements

**Development:**
- Python 3.12+
- Node.js (via pnpm)
- Docker & Docker Compose (for local Postgres + Redis)
- PostgreSQL 16 client utilities
- Redis client utilities

**Production:**
- Python 3.12 runtime
- PostgreSQL 16 database
- Redis 7 message broker
- Node.js build target (Next.js compiled to standalone)
- Example deployment: Railway.toml present in api and workers

## Additional Tooling

**Monorepo:**
- Turbo 2.8+ - Monorepo orchestrator for parallel builds/tests
- Workspace structure: apps (api, dashboard, workers, scripts) + packages (deprecated SDK/types)

**Build & Dev:**
- Next.js integrated build pipeline (server + client compilation)
- PostCSS 8 - CSS processing pipeline for Tailwind
- Autoprefixer 10 - Browser compatibility for CSS
- TypeScript strict mode enabled
- Path alias `@/*` → `src/*` for imports

---

*Stack analysis: 2026-02-28*
