FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml .
RUN uv sync --no-dev --frozen

COPY . .

CMD ["uv", "run", "celery", "-A", "alrt_workers.celery_app", "worker", "--loglevel=info"]
