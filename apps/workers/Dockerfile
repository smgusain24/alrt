FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY apps/workers/pyproject.toml apps/workers/pyproject.toml
RUN uv sync --no-dev --frozen --package alrt-workers

COPY apps/workers/ apps/workers/

WORKDIR /app/apps/workers

CMD ["uv", "run", "--package", "alrt-workers", "celery", "-A", "alrt_workers.celery_app", "worker", "--loglevel=info"]
