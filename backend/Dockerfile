FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

COPY requirements.txt .
RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    celery \
    redis \
    pydantic-settings \
    sqlalchemy \
    alembic \
    httpx \
    scikit-learn \
    pandas \
    psycopg2-binary

COPY backend/ ./backend/

EXPOSE 8000

# Default process: FastAPI. Override in docker-compose for the Celery worker, e.g.:
# celery -A backend.workers.celery_app worker --loglevel=info
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
