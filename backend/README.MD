# Backend Service

This is the FastAPI backend application, which includes background task processing with Celery and Redis.

## 🛠️ Tech Stack
- **Framework:** FastAPI
- **Task Queue:** Celery + Redis
- **Database ORM:** SQLAlchemy + Alembic (migrations)
- **Data Validation:** Pydantic v2
- **ML/Data:** Scikit-Learn + Pandas

## 🚀 Local Development Setup

1. **Navigate to this directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   *(Change this to `poetry install` or `pip install -r requirements.txt` based on your tool)*
   ```bash
   uv sync
   ```

3. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

## 🏃‍♂️ Running the Application

You need to run three separate processes to make the backend fully functional:

### 1. FastAPI Web Server
```bash
uvicorn app.main:app --reload
```

### 2. Celery Worker (for background tasks)
```bash
celery -A app.worker worker --loglevel=info
```

### 3. Redis Server
Ensure Redis is running locally or via Docker:
```bash
docker run -p 6379:6379 -d redis
```

## 🧪 Code Quality & Testing

- **Linting & Formatting:** `ruff check` / `ruff format`
- **Type Checking:** `mypy .`
- **Run Tests:** `pytest`
