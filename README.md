# TrainGrid

TrainGrid is an ML orchestration platform for training, tracking, and deploying ML models.

---

## Project Status

The first vertical slice (training a `RandomForestClassifier` on tabular CSV data) has a **functional but rough backend**. The frontend is **scaffolded only** — not yet wired to the backend.

### Backend (Functional)

- **FastAPI** application under `backend/api/` with routers, schemas, services, and core modules
- **Runs API** — `POST /runs/` to start training, `GET /runs/` to list, `GET /runs/{id}` to track
- **Health endpoint** — `GET /health` returns `{"status": "ok"}`
- **Celery worker** — `backend/workers/` handles background training via Celery tasks
- **Database** — SQLAlchemy models for runs (status, config, metrics, timestamps)
- **RandomForestClassifier trainer** — implemented in `backend/trainers/sklearn/` with typed configs
- **Trainer scaffolding** — base classes, registry, and stubs for XGBoost/PyTorch trainers
- **Domain layer** — entities and repository interfaces for runs, experiments, projects, models, deployments
- **Infrastructure** — SQLAlchemy session management, artifact storage ABC, queue broker
- **Shared** — enums (RunStatus, DeploymentStatus), custom errors (NotFoundError, TrainGridError), constants
- **Tests** — `tests/api/test_runs.py` and `tests/api/test_health.py` (4 tests total)

### Containerization

- `backend/Dockerfile` — shared image for FastAPI and Celery worker
- `docker-compose.yml` — services for PostgreSQL, Redis, API, and Celery worker with volume-based live-reload
- SQLite used for local development; PostgreSQL runs inside Docker

### CI/CD

- `.github/workflows/ci.yml` — GitHub Actions workflow with linting (ruff), type checking (mypy), and testing (pytest)

### Frontend (Scaffolded Only — Not Functional)

- **Vite + React + TypeScript** app scaffolded under `frontend/`
- Pages, components, and feature modules for: runs, projects, experiments, models, deployments
- **Not connected** to the backend API — no API client layer wired
- **Not containerized** — no Dockerfile, no service in docker-compose.yml

---

## Quick Start

### Prerequisites

- Python 3.10+
- Docker and Docker Compose (for containerized setup)
- Node.js (for frontend development)

### Backend (Local)

```bash
cd backend
uv venv
uv sync
uv run uvicorn backend.api.main:app --reload
```

### Worker (Local)

```bash
celery -A backend.workers.celery_app worker --loglevel=info
```

### Docker

```bash
docker compose up --build
```

### Tests

```bash
./check.sh   # runs ruff format, ruff check, mypy, then pytest
```

---

## API Reference

### `POST /runs/` — Start a training run

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

### `GET /runs/` — List all runs

### `GET /runs/{run_id}` — Track a run

### `GET /health` — Health check

---

## Project Architecture

```text
backend/
  api/               FastAPI app (routers, schemas, services, core)
  workers/           Celery worker config and tasks
  trainers/          ML model implementations (sklearn, xgboost, pytorch)
  domain/            Entities and repository interfaces
  infrastructure/    Database, storage, queue, tracking
  shared/            Enums, errors, constants, types
frontend/            React dashboard (scaffolded)
tests/               Automated tests by layer
docs/                Architecture documentation
```

See `docs/architecture.md` for the detailed layer breakdown.

---

## Development Roadmap

1. **Wire up logging and exception handling** — currently scaffolding exists but is unused
2. **Connect frontend to backend** — add API client layer, wire runs list/detail views
3. **Frontend containerization** — Dockerfile + docker-compose service
4. **Comprehensive test coverage** — ~54 tests across all layers (see AGENTS.md for plan)
5. **Expand trainers** — XGBoost, PyTorch implementations

---

## License

MIT
