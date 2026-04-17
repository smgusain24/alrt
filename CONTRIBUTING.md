# Contributing to alrt

Thanks for your interest in contributing to alrt! This guide will help you get started.

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for Postgres + Redis)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [pnpm](https://pnpm.io/) (Node package manager)

### Local Development

```bash
# Start infrastructure
docker compose up postgres redis -d

# API (auto-creates database tables on startup)
cd apps/api
uv sync
uv run uvicorn alrt.main:app --reload

# Workers (in a separate terminal)
cd apps/workers
uv sync
uv run celery -A alrt_workers.celery_app worker --loglevel=info -Q celery,email,slack,inapp,whatsapp,discord,telegram,sms,push

# Dashboard (in a separate terminal)
cd apps/dashboard
pnpm install
pnpm dev
```

API: `http://localhost:8000` | Dashboard: `http://localhost:3000`

## Code Style

### Python

- Follow the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- Use `ruff` for linting and formatting
- Use pattern-strings for logging: `logger.info("msg: %s", var)` (not f-strings)
- Line length: 120 characters
- Run before committing:

```bash
uv run --with ruff ruff check apps/
uv run --with ruff ruff format apps/
```

### TypeScript / Frontend

- Follow existing patterns in `apps/dashboard/`
- Use TypeScript strict mode
- Tailwind for styling

### Database

- Raw SQL with asyncpg (no ORM)
- Query constants in `apps/api/alrt/queries/`
- Schema changes go in `schema.sql` and inline in `apps/api/alrt/db.py`

## Testing

```bash
uv run pytest tests/              # All tests
uv run pytest tests/api/          # API tests
uv run pytest tests/workers/      # Worker tests
uv run pytest -x -k test_name    # Single test
```

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with clear, focused commits
3. Add tests for new functionality
4. Ensure `ruff check` passes with no errors
5. Update documentation if you changed behavior
6. Open a PR with a clear description of what and why

### PR Checklist

- [ ] Tests pass locally
- [ ] Linter passes (`ruff check apps/`)
- [ ] No new warnings introduced
- [ ] Documentation updated (if applicable)
- [ ] Commit messages are clear and descriptive

## Commit Messages

Use clear, descriptive commit messages:

- `fix: resolve delay node subscriber context loss`
- `feat: add Discord webhook channel support`
- `docs: update API authentication examples`
- `refactor: simplify email provider credential handling`

## Reporting Bugs

Use [GitHub Issues](https://github.com/smgusain24/alrt/issues) with the bug report template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Docker version, browser)
- Relevant logs

## Feature Requests

Open a [GitHub Issue](https://github.com/smgusain24/alrt/issues) with the feature request template. Describe:

- The use case
- Proposed solution
- Alternatives considered

## Security Issues

**Do not open a public issue for security vulnerabilities.** See [SECURITY.md](SECURITY.md) for reporting instructions.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
