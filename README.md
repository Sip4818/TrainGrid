# TrainGrid

TrainGrid is an ML orchestration platform for training, tracking, and deploying ML models.

---

## Project Status

The first vertical slice (training a `RandomForestClassifier` on tabular CSV data) works **end-to-end**: create a run through the HTTP API, the Celery worker trains the model, and the metrics plus trained artifact are persisted and returned by the API.

### Backend (Functional)

- **FastAPI** application under `backend/api/` with routers, schemas, services, and core modules
- **Runs API** — `POST /runs/` to start training, `GET /runs/` to list, `GET /runs/{id}` to track
- **Structured errors** — custom exceptions map to `{"detail": {"code", "message"}}` with correct HTTP status codes
- **Celery worker** — `backend/workers/` resolves the trainer from the registry, runs training, and writes results back to the DB
- **Trainer registry** — trainers self-register and are auto-discovered; new models plug in without wiring changes
- **RandomForestClassifier trainer** — implemented in `backend/trainers/sklearn/` with typed configs
- **Artifact storage** — `LocalArtifactStore` saves trained models under a configurable root; swappable for S3 later
- **Database** — SQLAlchemy models for runs and experiments; a default experiment is seeded on startup
- **Domain validation** — `POST /runs/` rejects unknown `trainer_name` (422) and unknown `experiment_id` (404) up front
- **Tests** — 217 pytest tests across API, workers, trainers, infrastructure, and MCP
- **Machine-readable clients** — OpenAPI docs, the MCP server (`mcp-server/`), and a planned Python SDK/CLI

### Containerization

- `backend/Dockerfile` — shared image for FastAPI and Celery worker
- `docker-compose.yml` — services for PostgreSQL, Redis, API, Celery worker, and MCP server
- SQLite used for local development; PostgreSQL runs inside Docker

### CI/CD

- `.github/workflows/ci.yml` — GitHub Actions: ruff (lint), mypy (types), pytest (backend tests), an integration job (Docker Compose stack, MCP contract check, API run-lifecycle smoke), and an S3/LocalStack artifact test

---

## Quick Start

### Prerequisites

- Python 3.10+
- Docker and Docker Compose (for containerized setup)

### Backend (Local)

```bash
uvicorn backend.api.main:app --reload
```

### Worker (Local)

```bash
celery -A backend.workers.celery_app worker --loglevel=info
```

### Docker

```bash
docker compose up --build
```

### Docker with S3 artifact storage (LocalStack)

```bash
make up-s3
```

This starts the stack with `STORAGE_BACKEND=s3`: artifacts (datasets, trained
models) go to an S3 bucket hosted by LocalStack (a local S3-compatible
service on port 4566) instead of the shared `artifacts` volume. The app
creates the `traingrid-artifacts` bucket automatically on startup. Plain
`make up` stays on local-disk storage with no S3 service running.

### Tests

```bash
./check.sh   # ruff format, ruff check, mypy, pytest
```

---

## API Reference

### `POST /runs/` — Start a training run

```json
{
  "experiment_id": 1,
  "trainer_name": "random_forest",
  "config": {
    "dataset_path": "dataset.csv",
    "target_column": "target",
    "feature_columns": ["feature1", "feature2"],
    "n_estimators": 100,
    "max_depth": null
  }
}
```

Returns `422 {"detail": {"code": "TRAINER_NOT_FOUND"}}` for an unknown `trainer_name` and `404` for an unknown `experiment_id`.

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
tests/               Automated tests by layer
docs/                Architecture documentation
```

See `docs/architecture.md` for the detailed layer breakdown.

---

## Development Roadmap

1. **Expand trainers** — XGBoost, then PyTorch implementations
2. **Model comparison** — compare metrics across runs side-by-side
3. **Experiment/project hierarchy** — CRUD endpoints + drill-down navigation
4. **S3 artifact storage** — swap `LocalArtifactStore` for an S3-backed store

See `AGENTS.md` for the detailed monthly plan.

---

## License

MIT
