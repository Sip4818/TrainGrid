FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy workspace metadata first so dependency layers cache
# until pyproject.toml or uv.lock change.
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/README.MD ./backend/

RUN uv sync --frozen --no-dev --package backend

# uv installs into /app/.venv; put its console scripts
# (uvicorn, celery) on PATH for the container commands.
ENV PATH="/app/.venv/bin:$PATH"

COPY backend/ ./backend/

EXPOSE 8000

# Default process: FastAPI. Override in docker-compose for the Celery worker, e.g.:
# celery -A backend.workers.celery_app worker --loglevel=info
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
