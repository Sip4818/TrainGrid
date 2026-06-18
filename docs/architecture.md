# TrainGrid Architecture

TrainGrid is organized as a layered ML orchestration platform. The main goal of
the structure is to keep HTTP handling, background jobs, training logic, and
external infrastructure concerns separate.

All backend source code lives under the `backend/` directory (a Python package).

## Top-Level Structure

```text
backend/                  Python package for all backend code
  api/              FastAPI backend and HTTP request handling
  workers/          Celery app and background task definitions
  trainers/         Model-specific training logic and trainer registry
  domain/           Core entities and repository interfaces
  infrastructure/   Database, storage, queue, and tracking integrations
  shared/           Common constants, enums, errors, and shared types
frontend/           React dashboard UI (scaffolded only)
tests/              Automated tests organized by layer
docs/               Project documentation and durable design context
```

## Request Flow

Typical training flow:

```text
frontend
  -> api router
  -> api service
  -> domain rule/entity
  -> infrastructure persistence or queue
  -> worker task
  -> trainer implementation
  -> infrastructure storage/tracking
```

The API should stay thin. Routers validate HTTP input and call services, while
services coordinate business actions such as creating runs, enqueueing worker
tasks, and returning response models.

## API Layer

The `backend/api/` package contains the FastAPI application.

```text
api/main.py              FastAPI app factory and router registration
api/core/                config (pydantic-settings), logging, security, exceptions
api/routers/             endpoint modules (health, runs, experiments, projects, models, deployments)
api/schemas/             Pydantic request and response models (run schema is active; others are stubs)
api/services/            application workflow orchestration (RunService is active; others are stubs)
api/dependencies/        FastAPI dependency providers (stubs)
```

| Router | Endpoints | Status |
|--------|-----------|--------|
| `health.py` | `GET /health` | ✅ Returns `{"status": "ok"}` |
| `runs.py` | `POST /runs/`, `GET /runs/`, `GET /runs/{run_id}` | ✅ Active — create, list, track training runs |
| `experiments.py` | — | ⏳ Stub |
| `projects.py` | — | ⏳ Stub |
| `models.py` | — | ⏳ Stub |
| `deployments.py` | — | ⏳ Stub |

Endpoints should be async where possible. Routers should not contain training,
database, or deployment implementation details.

## Worker Layer

The `backend/workers/` package contains background task execution.

```text
workers/celery_app.py    Celery app configuration (broker: Redis, result backend: Redis)
workers/tasks/           task modules for training, evaluation, deployment
```

| Task file | Active task | Status |
|-----------|-------------|--------|
| `training_tasks.py` | `start_training_run(run_id)` | ✅ Loads config, runs RandomForestClassifier, saves artifact, updates DB |
| `deployment_tasks.py` | — | ⏳ Stub |
| `evaluation_tasks.py` | — | ⏳ Stub |

Long-running work belongs in workers instead of API requests. Tasks should call
services, trainer registry entries, and infrastructure adapters rather than
duplicating business logic.

## Trainer Layer

The `backend/trainers/` package contains ML training implementations.

```text
trainers/base.py         abstract BaseTrainer interface (train, evaluate, save)
trainers/registry.py     TrainerRegistry singleton for trainer lookup
trainers/configs/        typed trainer configs (base, classification, regression)
trainers/sklearn/        scikit-learn: RandomForestClassifierTrainer (active)
trainers/xgboost/        XGBoost: stub
trainers/pytorch/        PyTorch: stub
```

| Trainer | Config | Status |
|---------|--------|--------|
| `RandomForestClassifierTrainer` | `RandomForestClassifierConfig` (dataclass) | ✅ Loads CSV, trains, evaluates, saves .joblib |
| XGBoost | — | ⏳ Stub |
| PyTorch | — | ⏳ Stub |

Trainer classes should be modular. Model configs should be supplied through
typed config objects instead of hardcoded inside trainer implementations.

## Domain Layer

The `backend/domain/` package represents core business concepts.

```text
domain/entities/         Project, Experiment, Run, Model, Deployment (all stubs)
domain/repositories/     repository interfaces for persistence boundaries (all stubs)
```

Business rules that are independent of FastAPI, Celery, SQLAlchemy, or cloud
services should live here as the project grows. Currently all stubs — logic is
directly in services and infrastructure.

## Infrastructure Layer

The `backend/infrastructure/` package contains adapters for external systems.

```text
infrastructure/database/ SQLAlchemy models (RunModel), session management (engine, SessionLocal, get_db)
infrastructure/storage/  ArtifactStore ABC, LocalStore stub, S3Store stub
infrastructure/queue/    broker stubs
infrastructure/tracking/ metrics and log persistence stubs
```

| File | Content | Status |
|------|---------|--------|
| `database/models.py` | `RunModel` (id, experiment_id, status, config, metrics, artifact_path, timestamps) | ✅ Active — used by RunService and Celery task |
| `database/session.py` | Engine factory, SessionLocal, Base, get_db generator | ✅ Active — handles SQLite and PostgreSQL |
| `storage/artifact_store.py` | `ArtifactStore` ABC (save, load) | ✅ Scaffold — implement concrete stores per deployment |
| `storage/local_store.py` | — | ⏳ Stub |
| `storage/s3_store.py` | — | ⏳ Stub |

Infrastructure code should be replaceable behind interfaces where practical.
For example, trainer code should not care whether artifacts are stored locally
or in S3.

## Shared Layer

The `backend/shared/` package contains cross-cutting concerns.

```text
shared/enums.py      RunStatus (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED) and DeploymentStatus
shared/errors.py     NotFoundError and TrainGridError base exception
tshared/constants.py  APP_NAME = "TrainGrid"
shared/types.py      Shared type aliases (stub)
```

## Frontend

The `frontend/` directory contains the React dashboard.

```text
frontend/src/app/        app-level routing, layout, providers
frontend/src/pages/      full page views
frontend/src/features/   feature-specific UI, hooks, types, API calls
frontend/src/components/ reusable layout and UI components
frontend/src/api/        shared API client (wired placeholder)
frontend/src/lib/        formatting and utility helpers
frontend/src/styles/     global styles
```

**Status:** Scaffolded only — boilerplate pages and components exist but the API
client layer is not connected to the backend. No Docker containerization yet.

The UI should behave like an operations dashboard: tables, status badges,
charts, logs, config panels, and direct workflow actions.

## Initial Vertical Slice

The first implementation focuses on one complete training path before the
platform grows horizontally.

```text
tabular CSV dataset
  -> api start-run endpoint (POST /runs/)
  -> celery training task (start_training_run)
  -> sklearn RandomForestClassifier trainer
  -> local artifact storage (artifacts/ directory)
  -> persisted run metrics and status (SQLite/PostgreSQL)
  -> frontend run detail view (not yet wired)
```

The vertical slice is **functional but rough**:

- `RandomForestClassifier` for classification on tabular data
- typed trainer config (`RandomForestClassifierConfig`) for model parameters and dataset settings
- local filesystem storage for artifacts
- minimal persistence for run metadata, metrics, and status transitions
- 4 API tests covering the health and runs endpoints

## Containerization

```text
backend/Dockerfile       Shared image for FastAPI and Celery worker
docker-compose.yml       PostgreSQL + Redis + API + Celery worker services
```

## Tests

Tests should mirror the main layers:

```text
tests/api/
tests/workers/
tests/trainers/
tests/domain/
tests/infrastructure/
```

Each layer should get focused tests as behavior is implemented. Keep at least
one collected test in the test suite so CI does not fail with pytest exit code 5.

Run tests with `./check.sh` (ruff format → ruff check → mypy → pytest).
