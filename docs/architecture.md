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
mcp-server/         MCP tool server that talks to the API over HTTP
tests/              Automated tests organized by layer
docs/               Project documentation and durable design context
```

## Request Flow

Typical training flow:

```text
client (HTTP API / MCP server / OpenAPI)
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
api/routers/             endpoint modules (health, runs, experiments, projects, models, deployments, datasets, sweeps, streams, artifacts)
api/schemas/             Pydantic request and response models
api/services/            application workflow orchestration
api/dependencies/        FastAPI dependency providers
```

| Router | Endpoints |
|--------|-----------|
| `health.py` | `GET /health` |
| `runs.py` | `POST /runs/`, `GET /runs/`, `GET /runs/{run_id}`, `GET /runs/compare`, `DELETE /runs/{run_id}` |
| `experiments.py` | `POST /experiments/`, `GET /experiments/`, `GET/PATCH/DELETE /experiments/{id}` |
| `projects.py` | `POST /projects/`, `GET /projects/`, `GET/PATCH/DELETE /projects/{id}` |
| `models.py` | `GET /trainers/` — lists registered trainers and their config schemas |
| `model_registry.py` | Model registration, version listing, stage promotion, prediction |
| `deployments.py` | Deploy/undeploy registered models and run inference |
| `datasets.py` | Upload and list datasets |
| `sweeps.py` | Create, list, and inspect hyperparameter sweeps |
| `streams.py` | `GET /runs/{run_id}/stream` — live training events over SSE |
| `artifacts.py` | Presigned upload/download URLs for artifact storage |

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
| `training_tasks.py` | `start_training_run(run_id)` | ✅ Loads config, runs trainer via registry, saves artifact via `LocalArtifactStore`, updates DB |
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
| `database/models.py` | `RunModel` (id, experiment_id, status, config, metrics, artifact_path, timestamps), `ExperimentModel` (id, project_id, name, created_at), `ProjectModel` (id, name, description, created_at) | ✅ Active — used by RunService, ProjectService, and ExperimentService |
| `database/session.py` | Engine factory, SessionLocal, Base, get_db generator | ✅ Active — handles SQLite and PostgreSQL |
| `database/seed.py` | `seed_defaults()` | ✅ Active — creates the default project + experiment on startup so run creation has a valid reference |
| `storage/artifact_store.py` | `ArtifactStore` ABC (save, load) | ✅ Scaffold — implement concrete stores per deployment |
| `storage/local_store.py` | `LocalArtifactStore` (save, load) | ✅ Active — used by the Celery training task |
| `storage/s3_store.py` | — | ⏳ Stub |

**Artifact storage design:** `ArtifactStore.save(source_path, artifact_path)` is a
*transport* contract, not a literal file copy. The trainer writes its model to a
temporary local path; the store then transports those bytes to their final home —
a `shutil.copy2` for `LocalArtifactStore`, or an S3 object upload for `S3Store`
later. This is required because S3 cannot be written to like a filesystem (every
write is an HTTP `PUT` of bytes), so a local source path is the common
denominator. `RunModel.artifact_path` stores the store-relative key (e.g.
`runs/{id}/model.joblib`), which is backend-agnostic — the same key works for
local disk and S3.

Infrastructure code should be replaceable behind interfaces where practical.
For example, trainer code should not care whether artifacts are stored locally
or in S3.

## Shared Layer

The `backend/shared/` package contains cross-cutting concerns.

```text
shared/enums.py      RunStatus (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED) and DeploymentStatus
shared/errors.py     Exception hierarchy: TrainGridError, NotFoundError, TrainerNotFoundError, TrainingRunNotFoundError, ExperimentNotFoundError
shared/constants.py  APP_NAME = "TrainGrid"
shared/types.py      Shared type aliases (stub)
```

## Clients

TrainGrid is backend-first. Clients consume the platform through:

- **HTTP API** — documented by the FastAPI OpenAPI schema at `/docs` and `/openapi.json`
- **MCP server** (`mcp-server/`) — exposes tools such as `create_run`, `get_run`, `list_runs`, and `compare_runs` over Streamable HTTP
- **Python SDK/CLI** — planned client packaging (see the open SDK/CLI issues)

There is no bundled web UI. Any future dashboard should live in its own
repository and talk to the API over HTTP, with no coupling in this repo.

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
  -> API / OpenAPI / MCP clients
```

The vertical slice is **functional end-to-end**:

- `RandomForestClassifier` for classification on tabular data
- typed trainer config (`RandomForestClassifierConfig`) for model parameters and dataset settings
- trainer registry with self-registration and auto-discovery
- local filesystem storage for artifacts (`LocalArtifactStore`)
- persistence for run metadata, metrics, status transitions, and artifacts
- experiment validation on run creation (unknown `experiment_id` → 404, unknown `trainer_name` → 422)
- 217 pytest tests across API, workers, trainers, infrastructure, and MCP

## Containerization

```text
backend/Dockerfile       Shared image for FastAPI and Celery worker
mcp-server/Dockerfile    MCP tool server image
docker-compose.yml       PostgreSQL + Redis + API + Celery worker + MCP server
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
