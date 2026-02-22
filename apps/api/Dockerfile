FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY apps/api/pyproject.toml apps/api/pyproject.toml
RUN uv sync --no-dev --frozen --package alrt-api

COPY apps/api/ apps/api/
COPY schema.sql schema.sql

WORKDIR /app/apps/api

CMD ["uv", "run", "--package", "alrt-api", "uvicorn", "alrt.main:app", "--host", "0.0.0.0", "--port", "8000"]
