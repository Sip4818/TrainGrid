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

## Current Status: Frontend Implementation & Backend Hardening (In Progress)
> **Currently working on:** Logging/Exception handling implementation

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

### Frontend (Phases 1–5 Complete — Phases 6+ In Progress)
> **Note:** The owner has zero knowledge of the React/Vite/TypeScript stack.
> All frontend code is **implemented and validated by AI** through automated test suites (Vitest, Playwright) and CI checks.
> The owner validates only that `./check.sh` passes and the Docker stack starts without errors.

- [x] **Vite + React App** scaffolded under `frontend/` with TypeScript — pages, components, and feature modules (runs, projects, experiments, models, deployments) exist as boilerplate but are **not connected to the backend API**.
- [x] **API Client layer** wired — `apiClient` fetch wrapper (`get`/`post`), `ApiError` class, and endpoint constants under `src/api/`. (17 passing vitest tests)
- [x] **Containerized** — Multi-stage `Dockerfile` (node build → nginx serve), `frontend` service in `docker-compose.yml` (port 3000).

### Immediate Next Steps

1. **[x] Runs list and detail views wired** — RunsPage (list+create), RunDetailPage (detail view with auto-polling)
2. **[x] Frontend containerized** — Multi-stage `Dockerfile` + `frontend` service in `docker-compose.yml` on port 3000.
3. **[x] Test coverage**: Comprehensive unit tests (108, 18 files) + Playwright E2E tests for runs flow.

---

## Logging & Exception Handling Plan

> **Status:** Not started — ready for implementation.

Both custom logging and custom exceptions exist as **unused scaffolding**. This plan wires them into the actual application flow across every layer: shared errors, API exception handlers, services, routers, and Celery workers.

### Current State Audit

| File | Current State | Problem |
|------|---------------|---------|
| `shared/errors.py` | Defines `NotFoundError(Exception)` — never imported or used | Dead code |
| `api/core/exceptions.py` | Defines `TrainGridError(Exception)` — never imported or used | Dead code; no hierarchy with `NotFoundError` |
| `api/core/logging.py` | Defines `configure_logging()` — never called | Dead code; zero `logger` usage across entire backend |
| `api/routers/runs.py` | `get_run` returns `200 OK` with `{"error": "Run not found"}` | Breaks HTTP semantics; frontend gets no status code signal |
| `api/services/run_service.py` | `get_run()` returns `None`; no try/except on Celery dispatch | Callers need `if result is None` boilerplate; silent Celery failures |
| `workers/tasks/training_tasks.py` | Not-found returns dict; generic `except Exception` with no logging | Training lifecycle is invisible; errors only stored in DB metrics column |
| `api/main.py` | No `configure_logging()` call; no exception handlers registered | Logging and exception infrastructure completely disconnected |

### Dependencies

- **No new packages needed** — Python `logging` is stdlib, FastAPI has built-in exception handler support
- **No new files created** — all changes are to existing files
- **One test update required** — `test_get_run_not_found` currently expects `200`; will need `404`

---

### Phase 1: Custom Exceptions (7 Steps)

**Goal:** Consistent HTTP error responses with proper status codes. Every error returns `{"detail": {"code": "ERROR_CODE", "message": "Human-readable message"}}` with the correct HTTP status code.

#### Step 1.1 — Unify Exception Hierarchy in `shared/errors.py`

Move `TrainGridError` here as the shared base class. Make `NotFoundError` inherit from it. Add `TrainingRunNotFoundError` for run-specific lookups.

**Why `shared/errors.py`?** Because exceptions are raised in both the API layer (`api/services/`) and the worker layer (`workers/tasks/`). Placing them in `shared/` keeps both layers decoupled from each other.

```python
# backend/shared/errors.py


class TrainGridError(Exception):
    """Base exception for all TrainGrid application errors.

    All custom exceptions inherit from this so a single FastAPI
    exception handler can catch the entire hierarchy.
    """


class NotFoundError(TrainGridError):
    """Raised when a requested resource does not exist."""


class TrainingRunNotFoundError(NotFoundError):
    """Raised when a training run ID does not exist in the database."""

    def __init__(self, run_id: int | str) -> None:
        self.run_id = run_id
        super().__init__(f"Training run {run_id} not found")
```

#### Step 1.2 — Delete `TrainGridError` from `api/core/exceptions.py`, Add FastAPI Handlers

Replace the current single-class file with FastAPI exception handler functions. These catch our custom exceptions and return JSON responses with proper HTTP status codes.

**Why `api/core/exceptions.py`?** FastAPI exception handlers are API-layer concerns — they translate Python exceptions into HTTP responses. The worker layer never uses these handlers (Celery tasks don't return HTTP responses).

```python
# backend/api/core/exceptions.py

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.api.core.logging import get_logger
from backend.shared.errors import NotFoundError, TrainGridError

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        logger.warning("Resource not found: %s [%s %s]", exc, request.method, request.url.path)
        return JSONResponse(
            status_code=404,
            content={
                "detail": {
                    "code": "NOT_FOUND",
                    "message": str(exc),
                }
            },
        )

    @app.exception_handler(TrainGridError)
    async def traingrid_error_handler(request: Request, exc: TrainGridError) -> JSONResponse:
        logger.exception("Unhandled TrainGridError: %s [%s %s]", exc, request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "code": "INTERNAL_ERROR",
                    "message": str(exc),
                }
            },
        )
```

#### Step 1.3 — Register Exception Handlers in `api/main.py`

Import and call `register_exception_handlers(app)` after creating the FastAPI app instance.

```diff
 # backend/api/main.py

 from fastapi import FastAPI
 from fastapi.middleware.cors import CORSMiddleware

 from backend.api.routers import health, runs
+from backend.api.core.exceptions import register_exception_handlers
 from backend.infrastructure.database.session import engine, Base


 def create_app() -> FastAPI:
     # 1. Initialize Database Tables
     Base.metadata.create_all(bind=engine)

     # 2. Create App
     app = FastAPI(title="TrainGrid API")

     # Configure CORS middleware
     app.add_middleware(
         CORSMiddleware,
         allow_origins=["*"],
         allow_credentials=True,
         allow_methods=["*"],
         allow_headers=["*"],
     )

-    # 3. Register Routers
+    # 3. Register Exception Handlers
+    register_exception_handlers(app)
+
+    # 4. Register Routers
     app.include_router(health.router)
     app.include_router(runs.router)

     return app
```

#### Step 1.4 — Update `api/services/run_service.py` to Raise Exceptions

`get_run` raises `TrainingRunNotFoundError` instead of returning `None`. `create_run` wraps Celery dispatch in try/except to catch broker connection failures.

```python
# backend/api/services/run_service.py

from sqlalchemy.orm import Session

from backend.api.schemas.run import RunCreate
from backend.infrastructure.database.models import RunModel
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError


class RunService:
    """
    Application service for creating and retrieving training runs.

    This service owns the workflow for the first vertical slice:
    persist the run, commit it, and enqueue the background training task.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_run(self, payload: RunCreate) -> RunModel:
        run = RunModel(
            experiment_id=payload.experiment_id,
            status=RunStatus.PENDING,
            config=payload.config,
            metrics={},
            artifact_path=None,
        )

        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        from backend.workers.tasks.training_tasks import start_training_run

        try:
            start_training_run.delay(str(run.id))
        except Exception:
            # Celery broker unavailable — run stays PENDING, will be retried
            pass

        return run

    def get_run(self, run_id: int) -> RunModel:
        run = self.db.get(RunModel, run_id)
        if run is None:
            raise TrainingRunNotFoundError(run_id)
        return run

    def get_runs(self) -> list[RunModel]:
        return self.db.query(RunModel).all()
```

**Key changes:**
- `get_run` return type changes from `RunModel | None` → `RunModel`
- `get_run` raises `TrainingRunNotFoundError` instead of returning `None`
- `create_run` wraps Celery dispatch in try/except (broker failures shouldn't crash the API)

#### Step 1.5 — Simplify `api/routers/runs.py`

Remove the inline `if run is None` check — the exception handler now catches `TrainingRunNotFoundError` and returns `404` automatically.

```python
# backend/api/routers/runs.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas.run import RunCreate
from backend.api.services.run_service import RunService
from backend.infrastructure.database.session import get_db

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    """Retrieve a training run by its ID."""
    service = RunService(db)
    return service.get_run(run_id)


@router.get("/")
def get_runs(db: Session = Depends(get_db)):
    """Retrieve all training runs."""
    service = RunService(db)
    return service.get_runs()


@router.post("/")
def create_run(payload: RunCreate, db: Session = Depends(get_db)):
    """Create a new training run with the given configuration."""
    service = RunService(db)
    return service.create_run(payload)
```

**Key change:** `get_run` endpoint is 3 lines instead of 5. No more `if run is None: return {"error": ...}`.

#### Step 1.6 — Update `workers/tasks/training_tasks.py` to Use `TrainingRunNotFoundError`

Replace the silent `return {"status": "not_found"}` with a raised `TrainingRunNotFoundError`.

```diff
 # backend/workers/tasks/training_tasks.py (not-found section only)

         run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
         if not run:
-            return {"run_id": run_id, "status": "not_found"}
+            raise TrainingRunNotFoundError(run_id)
```

Add the import at the top:
```diff
+from backend.shared.errors import TrainingRunNotFoundError
```

#### Step 1.7 — Update `tests/api/test_runs.py`

The `test_get_run_not_found` test must change from expecting `200` to expecting `404` with the new response format.

```diff
 # tests/api/test_runs.py

 def test_get_run_not_found():
     response = client.get("/runs/999999")
-    assert response.status_code == 200
-    assert response.json() == {"error": "Run not found"}
+    assert response.status_code == 404
+    data = response.json()
+    assert data["detail"]["code"] == "NOT_FOUND"
+    assert "999999" in data["detail"]["message"]
```

---

### Phase 2: Structured Logging (6 Steps)

**Goal:** Every significant action is traceable via structured logs with component names, filenames, line numbers, and contextual fields like `run_id`.

#### Step 2.1 — Enhance `api/core/logging.py`

Add a `get_logger(name)` helper, add `filename` and `lineno` to the format string, and configure the root logger once.

```python
# backend/api/core/logging.py

import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    """Configure the root logger for the TrainGrid application.

    Call once at application startup (in create_app or Celery worker init).
    Uses a structured format with timestamp, level, component name,
    filename, line number, and message.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s %(levelname)-8s %(name)-30s %(filename)s:%(lineno)d — %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.setLevel(level)

    # Avoid duplicate handlers on repeated calls (e.g. in tests)
    if not root.handlers:
        root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger for the given module.

    Usage:
        from backend.api.core.logging import get_logger
        logger = get_logger(__name__)
        logger.info("Something happened", extra={"run_id": 42})
    """
    return logging.getLogger(name)
```

**Key decisions:**
- Logs go to `stdout` (not a file) — Docker captures `stdout` and makes it available via `docker compose logs`.
- Format includes `%(name)s` so you can filter by component (e.g. `backend.api.services.run_service`).
- `get_logger(__name__)` gives each module its own named logger.

#### Step 2.2 — Activate Logging in `api/main.py`

Call `configure_logging()` at the very top of `create_app()`, before anything else runs.

```diff
 # backend/api/main.py

+from backend.api.core.logging import configure_logging, get_logger

 def create_app() -> FastAPI:
+    # 0. Initialize Logging
+    configure_logging()
+    logger = get_logger(__name__)
+    logger.info("Starting TrainGrid API")
+
     # 1. Initialize Database Tables
     Base.metadata.create_all(bind=engine)
```

#### Step 2.3 — Add Logging to `api/routers/runs.py`

Log each incoming request with relevant context.

```diff
 # backend/api/routers/runs.py

+from backend.api.core.logging import get_logger
+
+logger = get_logger(__name__)
+

 @router.get("/{run_id}")
 def get_run(run_id: int, db: Session = Depends(get_db)):
     """Retrieve a training run by its ID."""
+    logger.info("GET /runs/%s", run_id)
     service = RunService(db)
     return service.get_run(run_id)

 @router.get("/")
 def get_runs(db: Session = Depends(get_db)):
     """Retrieve all training runs."""
+    logger.info("GET /runs/")
     service = RunService(db)
     return service.get_runs()

 @router.post("/")
 def create_run(payload: RunCreate, db: Session = Depends(get_db)):
     """Create a new training run with the given configuration."""
+    logger.info("POST /runs/ experiment_id=%s", payload.experiment_id)
     service = RunService(db)
     return service.create_run(payload)
```

#### Step 2.4 — Add Logging to `api/services/run_service.py`

Log business logic events: run creation, Celery dispatch success/failure, and run lookups.

```diff
 # backend/api/services/run_service.py

+from backend.api.core.logging import get_logger
+
+logger = get_logger(__name__)
+

 def create_run(self, payload: RunCreate) -> RunModel:
     ...
     self.db.refresh(run)
+    logger.info("Run created: run_id=%s experiment_id=%s", run.id, run.experiment_id)

     try:
         start_training_run.delay(str(run.id))
+        logger.info("Celery task dispatched: run_id=%s", run.id)
     except Exception:
+        logger.exception("Failed to dispatch Celery task: run_id=%s", run.id)
         pass

     return run

 def get_run(self, run_id: int) -> RunModel:
     run = self.db.get(RunModel, run_id)
     if run is None:
+        logger.warning("Run not found: run_id=%s", run_id)
         raise TrainingRunNotFoundError(run_id)
     return run
```

#### Step 2.5 — Add Logging to `workers/tasks/training_tasks.py`

Log the full training lifecycle: task start, status transitions, completion, and failure with traceback.

```python
# backend/workers/tasks/training_tasks.py (full replacement)

import logging
import os
from datetime import datetime

from backend.workers.celery_app import celery_app
from backend.infrastructure.database.session import SessionLocal
from backend.infrastructure.database.models import RunModel
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError
from backend.trainers.sklearn.config import RandomForestClassifierConfig
from backend.trainers.sklearn.trainer import RandomForestClassifierTrainer

logger = logging.getLogger(__name__)


@celery_app.task(name="training.start_run")
def start_training_run(run_id: str) -> dict[str, str]:
    logger.info("Task received: run_id=%s", run_id)
    db = SessionLocal()
    try:
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if not run:
            logger.error("Run not found in DB: run_id=%s", run_id)
            raise TrainingRunNotFoundError(run_id)

        logger.info("Starting training: run_id=%s", run_id)
        run.status = RunStatus.RUNNING  # type: ignore[assignment]
        run.started_at = datetime.utcnow()  # type: ignore[assignment]
        db.commit()

        config_data = run.config
        rf_config = RandomForestClassifierConfig(**config_data)

        trainer = RandomForestClassifierTrainer(config=rf_config)
        trainer.train()
        metrics = trainer.evaluate()
        logger.info("Training completed: run_id=%s metrics=%s", run_id, metrics)

        os.makedirs("artifacts", exist_ok=True)
        artifact_path = f"artifacts/model_{run_id}.joblib"
        trainer.save(artifact_path)

        run.metrics = metrics  # type: ignore[assignment]
        run.artifact_path = artifact_path  # type: ignore[assignment]
        run.status = RunStatus.COMPLETED  # type: ignore[assignment]
        run.finished_at = datetime.utcnow()  # type: ignore[assignment]
        db.commit()

        logger.info("Run completed successfully: run_id=%s artifact=%s", run_id, artifact_path)
        return {"run_id": run_id, "status": "completed"}

    except Exception as e:
        logger.exception("Training failed: run_id=%s error=%s", run_id, e)
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if run:
            run.status = RunStatus.FAILED  # type: ignore[assignment]
            run.finished_at = datetime.utcnow()  # type: ignore[assignment]
            run.metrics = {"error": str(e)}  # type: ignore[assignment]
            db.commit()
        return {"run_id": run_id, "status": "failed", "error": str(e)}
    finally:
        db.close()
```

**Key additions:**
- `logger.info` at task receipt, training start, training completion
- `logger.exception` on failure (automatically includes the full traceback)
- `logger.error` when run_id is not found in DB

#### Step 2.6 — Add Logging to Exception Handlers in `api/core/exceptions.py`

Already included in Step 1.2 above — the `not_found_handler` uses `logger.warning()` and the `traingrid_error_handler` uses `logger.exception()` to capture full stack traces.

---

### Phase 3: Test Updates (1 Step)

#### Step 3.1 — Update `tests/api/test_runs.py`

Already detailed in Step 1.7 above. Summary of all test changes:

| Test | Before | After |
|------|--------|-------|
| `test_get_run_not_found` | Expects `200` + `{"error": "Run not found"}` | Expects `404` + `{"detail": {"code": "NOT_FOUND", "message": "..."}}` |
| `test_create_run` | No change needed | No change needed |
| `test_get_runs` | No change needed | No change needed |

---

### Execution Order

1. **Phase 1 first** — exception hierarchy and handlers. This is the core architectural fix.
2. **Phase 2 next** — logging. This layer builds on the exception handlers (handlers log errors).
3. **Phase 3 last** — test updates. Run `./check.sh` to confirm everything passes.

All three phases can be implemented in a single session. Run `./check.sh` after completing all phases to verify linting, types, and tests pass.

### Expected Log Output After Implementation

**API startup:**
```
2026-06-25T16:00:00 INFO     backend.api.main                main.py:12 — Starting TrainGrid API
```

**Successful run creation:**
```
2026-06-25T16:01:00 INFO     backend.api.routers.runs         runs.py:25 — POST /runs/ experiment_id=1
2026-06-25T16:01:00 INFO     backend.api.services.run_service run_service.py:34 — Run created: run_id=10 experiment_id=1
2026-06-25T16:01:00 INFO     backend.api.services.run_service run_service.py:38 — Celery task dispatched: run_id=10
2026-06-25T16:01:01 INFO     backend.workers.tasks.training_tasks training_tasks.py:19 — Task received: run_id=10
2026-06-25T16:01:01 INFO     backend.workers.tasks.training_tasks training_tasks.py:26 — Starting training: run_id=10
2026-06-25T16:01:02 INFO     backend.workers.tasks.training_tasks training_tasks.py:35 — Training completed: run_id=10 metrics={'accuracy': 1.0}
2026-06-25T16:01:02 INFO     backend.workers.tasks.training_tasks training_tasks.py:44 — Run completed successfully: run_id=10 artifact=artifacts/model_10.joblib
```

**Failed run (e.g. bad dataset path):**
```
2026-06-25T16:02:00 INFO     backend.workers.tasks.training_tasks training_tasks.py:19 — Task received: run_id=11
2026-06-25T16:02:00 INFO     backend.workers.tasks.training_tasks training_tasks.py:26 — Starting training: run_id=11
2026-06-25T16:02:00 ERROR    backend.workers.tasks.training_tasks training_tasks.py:47 — Training failed: run_id=11 error=[Errno 2] No such file or directory: 'bad.csv'
Traceback (most recent call last):
  File "backend/workers/tasks/training_tasks.py", line 32, in start_training_run
    ...
FileNotFoundError: [Errno 2] No such file or directory: 'bad.csv'
```

**404 on unknown run:**
```
2026-06-25T16:03:00 INFO     backend.api.routers.runs         runs.py:14 — GET /runs/999
2026-06-25T16:03:00 WARNING  backend.api.services.run_service run_service.py:46 — Run not found: run_id=999
2026-06-25T16:03:00 WARNING  backend.api.core.exceptions      exceptions.py:14 — Resource not found: Training run 999 not found [GET /runs/999]
```


---

## Test Coverage Plan

Comprehensive test plan for all backend implementations, organized by layer.

**Run tests with:** `./check.sh` (runs ruff format, ruff check, mypy, then pytest)

### Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

> **Status:** Phases 1–5 complete (all unit tests, conftest fixtures, and CI integration done).
> Remaining phases depend on feature implementation completion.

---

### Phase 1: Shared & Infrastructure Layer (pure unit tests, no DB)

| File | Tests | Status |
|------|-------|--------|
| `tests/shared/test_enums.py` | RunStatus/DeploymentStatus values, str enum behavior | `[x]` |
| `tests/shared/test_errors.py` | NotFoundError message and exception hierarchy | `[x]` |
| `tests/shared/test_constants.py` | APP_NAME == "TrainGrid" | `[x]` |
| `tests/infrastructure/test_database_models.py` | RunModel default status, table name, columns | `[x]` |
| `tests/infrastructure/test_artifact_store.py` | ABC cannot be instantiated, abstract methods raise | `[x]` |

**Total Phase 1: ~12 tests across 5 files**

---

### Phase 2: Trainer Layer (unit tests, no DB)

| File | Tests | Status |
|------|-------|--------|
| `tests/trainers/test_base.py` | BaseTrainer ABC cannot be instantiated, abstract methods | `[x]` |
| `tests/trainers/test_registry.py` | register/get, KeyError for unknown, singleton instance | `[x]` |
| `tests/trainers/test_sklearn_config.py` | RandomForestClassifierConfig defaults and custom values | `[x]` |
| `tests/trainers/test_sklearn_trainer.py` | Initialization, pre-train guards (evaluate/save) | `[x]` |
| `tests/trainers/test_configs_base.py` | TrainerConfig forbids extra fields | `[x]` |
| `tests/trainers/test_configs_classification.py` | ClassificationConfig requires target_column | `[x]` |
| `tests/trainers/test_configs_regression.py` | RegressionConfig requires target_column | `[x]` |

**Total Phase 2: ~18 tests across 7 files**

---

### Phase 3: API Layer (schemas, services, routers, core)

| File | Tests | Status |
|------|-------|--------|
| `tests/api/test_schemas_run.py` | RunCreate valid/missing-field validation, Run response from_attributes | `[x]` |
| `tests/api/test_run_service.py` | RunService create/get/get_all with mocked DB | `[x]` |
| `tests/api/test_runs.py` *(expand)* | Add: valid-run GET, invalid POST validation, list-after-create | `[x]` |
| `tests/api/test_core_config.py` | Settings defaults and env override | `[x]` |
| `tests/api/test_core_exceptions.py` | TrainGridError raise/catch and inheritance | `[x]` |

**Total Phase 3: ~18 tests across 5 files**

---

### Phase 4: Worker Layer

| File | Tests | Status |
|------|-------|--------|
| `tests/workers/test_celery_app.py` | Celery app name and config from settings | `[x]` |
| `tests/workers/test_training_tasks.py` | Not-found, success, failure, timestamps | `[x]` |

**Total Phase 4: ~6 tests across 2 files**

---

### Phase 5: Test Infrastructure (fixtures)

| File | Purpose | Status |
|------|---------|--------|
| `tests/conftest.py` | db_session (in-memory SQLite), run_service, sample payload fixtures | `[x]` |
| `tests/api/conftest.py` | TestClient with dependency override for test DB | `[x]` |

---

### Execution Order

1. **Phase 1 first** — pure unit tests, no DB, no FastAPI, no Celery → fastest feedback
2. **Phase 2 next** — trainer tests, still pure Python, no external dependencies
3. **Phase 3 then** — API schemas and services (need DB fixtures from Phase 5), then router tests
4. **Phase 4 last** — worker tests (need full DB + optional Celery broker)
5. **Phase 5 as needed** — conftest fixtures built incrementally as phases 3-4 require them

Run `./check.sh` after each phase to ensure linting, types, and tests all pass.


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

## Frontend Wiring Plan — Phase 3 (Vertical Slice Connection)

### Current State

The frontend build configuration is **complete** and the API client layer is **implemented + tested**. Build config files (`vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vite-env.d.ts`, `vitest.config.ts`) now exist, all necessary packages are installed, and CI runs frontend checks (`tsc`, `vitest`, `build`). Phases 1-8 are implemented and tested.

| File | Status |
|------|--------|
| `src/api/client.ts`, `endpoints.ts` | **Implemented + tested** (17 vitest tests) |
| `src/features/runs/` (api, types, hooks) | `types.ts` tested (15 tests); `api.ts` tested (12 tests); `hooks.ts` implemented with TanStack Query (3 hooks: useRuns, useRun, useCreateRun) |
| `src/pages/RunsPage.tsx` | **Implemented** — table, create modal, status badges, navigation to detail (3 vitest tests) |
| `src/pages/RunDetailPage.tsx` (+ test file) | **Implemented** — single run view, auto-polling every 3s, config/timeline/metrics display |
| `src/components/ui/*` | Implemented (8 components + 8 test files) — vitest + `tsc --noEmit` + build all pass |
| `src/components/layout/*` (Sidebar, Topbar, PageHeader) | Implemented (3 components + 3 test files) |
| `src/app/routes.tsx`, `layout.tsx`, `providers.tsx` | Implemented — router, shell, providers |
| `src/App.tsx` | Wired with `<RouterProvider>` |
| `src/main.tsx` | Bootstraps app with `<Providers>` wrapper |
| `package.json` | Has all necessary dependencies |
| `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vite-env.d.ts` | **Created** |

### Execution Phases

Each phase must produce working code validated by `./check.sh`. No phase depends on a running backend — use mocked data for development and test-driven validation.

| Phase | What | Key Files | Validation |
|-------|------|-----------|------------|
| **1. Build Config** [x] | Create `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`. Add deps to `package.json`: `react-router-dom`, `@tanstack/react-query`, `vitest`, `@testing-library/react`, `jsdom`, `playwright`. | `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/package.json` | `npm run build` succeeds |
| **2. API Client** [x] | `apiClient` fetch wrapper with base URL, error handling, JSON serialization. Endpoint constants. | `frontend/src/api/client.ts`, `frontend/src/api/endpoints.ts` | `npm run build` + vitest |
| **3. Run Types** [x] | TypeScript types mirroring backend Pydantic: `RunStatus`, `RunConfig`, `RunCreate`, `Run` | `frontend/src/features/runs/types.ts` | `npm run build` + vitest |
| **4. Run API** [x] | `createRun()`, `getRun()`, `getRuns()` functions | `frontend/src/features/runs/api.ts` | vitest (mock fetch) |
| **5. UI Components** [x] | Build `Button`, `Badge` (status-colored), `Spinner`, `Table`, `Modal`, `Input`, `Select`, `Tabs` | `frontend/src/components/ui/*.tsx` | vitest (render + interaction) |
| **6. Layout Components** [x] | `Sidebar` (nav links), `Topbar` (app name), `PageHeader` (title+description) | `frontend/src/components/layout/*.tsx` | vitest (render) |
| **7. Routing & Shell** [x] | React Router routes, app shell with Sidebar+Topbar+`<Outlet>`, QueryClient provider | `frontend/src/app/routes.tsx`, `layout.tsx`, `providers.tsx` | `npm run build` |
| **8. Runs List Page** [x] | `RunsPage`: table of all runs, create-run modal with form fields, status badges, row click → detail | `frontend/src/pages/RunsPage.tsx` | vitest + Playwright |
| **9. Run Detail Page** [x] | `RunDetailPage`: single run view, auto-polling every 3s while PENDING/RUNNING, config+metrics display | `frontend/src/pages/RunDetailPage.tsx` | vitest + Playwright |
| **10. Dashboard Page** | `DashboardPage`: summary cards with run counts by status | `frontend/src/pages/DashboardPage.tsx` | vitest |
| **11. App Wiring** [x] | Wire providers + router in `main.tsx`, `App.tsx` renders the app | `frontend/src/main.tsx`, `frontend/src/App.tsx` | `npm run build` |
| **12. Containerization** [x] | Multi-stage `Dockerfile` (node build → nginx serve), `frontend` service in `docker-compose.yml` (port 3000) | `frontend/Dockerfile`, `docker-compose.yml` | `docker compose up frontend` |
| **13. Frontend Tests** [x] | `vitest.config.ts`, unit tests for components/api/hooks, Playwright E2E for runs flow, integrate into `./check.sh` | `frontend/vitest.config.ts`, `frontend/src/**/*.test.tsx`, `frontend/e2e/` | `./check.sh` passes |

### Critical Rules for Frontend Implementation

1. **No hardcoded API URLs** — use the `apiClient` base URL configurable via Vite env vars
2. **TypeScript everywhere** — no `any` types, strict mode enabled
3. **Auto-polling for active runs** — use `@tanstack/react-query`'s `refetchInterval` (3s) when run status is PENDING or RUNNING
4. **Graceful error states** — show error messages when API calls fail, not blank screens
5. **Responsive CSS** — enough styling for a usable dashboard (no CSS framework, keep it simple with CSS modules or plain CSS)
6. **Test-driven** — each component gets a Vitest render test; critical user paths get Playwright E2E tests
7. **Owner validates only via `./check.sh`** — no manual frontend review needed

---

## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
- **AI Commits:** If a commit is made by AI or with AI assistance, the commit message must include the AI model name and state that it was generated with AI assistance. Format: `feat: description [generated with ai assistant]`. This ensures traceability of AI-generated contributions.
