# AGENTS.md

## Project Overview
TrainGrid is an ML orchestration platform for training,
tracking, and deploying ML models.

## Architecture
- api/ -> FastAPI backend
- workers/ -> Celery workers
- trainers/ -> model-specific training logic
- frontend/ -> React dashboard

See docs/architecture.md for the detailed project structure and layer responsibilities.

## Commands
Start backend:
uvicorn backend.api.main:app --reload

Start worker:
celery -A backend.workers.celery_app worker --loglevel=info

## Rules
- Use async FastAPI endpoints where possible
- Follow strict OOP principles and keep production-grade code quality
- Keep trainer classes modular
- Do not hardcode model configs
- **Planning:** ALWAYS provide a plan and the proposed code in the chat before making any actual code changes. Do not execute code changes without prior approval.
- **Communication:** After every code change or implementation step, provide a concise explanation of WHAT was changed and WHY it was put in that specific file/directory. This is crucial for learning the architecture.
- **Command Execution:** Always run commands one by one and avoid executing multiple commands in a single step (e.g., avoid joining commands with `;` or `&&`).
- **Validation:** Before completing any task, you MUST run the project's quality checks by executing `./check.sh`.

## Current Status: Vertical Slice - Tabular Training (Partial)

The first vertical slice (training a `RandomForestClassifier` on tabular CSV data) has a **functional but rough backend**. The frontend is **scaffolded only** — not yet wired to the backend.

### Backend (Functional — Barely)

- [x] **Architecture defined** in `docs/architecture.md`.
- [x] **RandomForest Trainer** implemented in `trainers/sklearn/`.
- [x] **Database Model** for Runs created in `infrastructure/database/models.py`.
- [x] **API Schemas** (Pydantic) defined in `api/schemas/run.py`.
- [x] **Run Service** (`api/services/run_service.py`): Logic to create runs and trigger Celery tasks.
- [x] **API Router** (`api/routers/runs.py`): Endpoints to start and track runs.
- [x] **Celery Task** (`workers/tasks/training_tasks.py`): Connects trainer and saves results to DB.
- [x] **Backend Initialization** (`api/main.py`): DB table creation and router registration.
- [x] **API Tests** (`tests/api/test_runs.py`): End-to-end tests for the `/runs` endpoints using `TestClient`.

**Containerization**
- [x] **Backend Dockerfile** (`backend/Dockerfile`): Shared image for FastAPI and Celery worker.
- [x] **Docker Compose** (`docker-compose.yml`): Services for PostgreSQL, Redis, API, and Celery worker with volume-based live-reload. SQLite is used for local development; PostgreSQL runs inside Docker.
- [x] **CI/CD Pipeline** (`.github/workflows/ci.yml`): GitHub Actions workflow with linting (ruff), type checking (mypy), and testing (pytest).

### Frontend (Scaffolded Only — Not Functional)
> **Note:** The owner has zero knowledge of the React/Vite/TypeScript stack.
> All frontend code is **implemented and validated by AI** through automated test suites (Vitest, Playwright) and CI checks.
> The owner validates only that `./check.sh` passes and the Docker stack starts without errors.

- [ ] **Vite + React App** scaffolded under `frontend/` with TypeScript — pages, components, and feature modules (runs, projects, experiments, models, deployments) exist as boilerplate but are **not connected to the backend API**.
- [ ] **No API client layer** wired — the frontend cannot fetch or display real data.
- [ ] **Not containerized** — no Dockerfile, no service in `docker-compose.yml`.

### Immediate Next Steps

1.  **Connect frontend to backend**: Add an API client layer (e.g., generated OpenAPI client or manual fetch wrappers) and wire up the runs list/detail views to the `/runs/` endpoints.
2.  **Frontend containerization**: Add a `Dockerfile` for the React frontend inside `frontend/` and register it in `docker-compose.yml`.
3.  **Test coverage**: Write comprehensive tests across all layers — API schemas, services, database models, trainers, registry, shared enums, and worker tasks.


### API Input Reference (First Vertical Slice)

The `POST /runs/` endpoint accepts the following JSON body:

```json
{
  "experiment_id": 1,
  "config": {
    "dataset_path": "dataset.csv",
    "target_column": "target",
    "feature_columns": ["feature1", "feature2"],
    "n_estimators": 100,
    "max_depth": null
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `experiment_id` | int | Yes | Links the run to an experiment |
| `config.dataset_path` | string | Yes | Path to the CSV file (e.g. `dataset.csv`) |
| `config.target_column` | string | Yes | Name of the target/label column |
| `config.feature_columns` | list[str] | Yes | Names of the feature columns |
| `config.n_estimators` | int | No | Number of trees in the forest (default: `100`) |
| `config.max_depth` | int / null | No | Max tree depth (`null` = unlimited, default: `null`) |

**cURL example:**

```bash
curl -X POST http://localhost:8000/runs/ \
  -H "Content-Type: application/json" \
  -d '{
    "experiment_id": 1,
    "config": {
      "dataset_path": "dataset.csv",
      "target_column": "target",
      "feature_columns": ["feature1", "feature2"],
      "n_estimators": 100,
      "max_depth": null
    }
  }'
```

Track a run: `GET /runs/{run_id}` — returns status, metrics, timestamps.
List all runs: `GET /runs/` — returns every run in the database.


---

## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
