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

## Current Status

The backend is fully instrumented and the frontend connects correctly — training runs can be created, tracked, and viewed end-to-end.

### Backend
- FastAPI + SQLAlchemy + Celery fully wired with structured logging and exception handling
- Errors return `{"detail": {"code": "...", "message": "..."}}` with correct HTTP status codes
- RandomForest trainer implemented in `trainers/sklearn/`
- Containerized via Docker Compose (PostgreSQL + Redis + API + Worker); SQLite used for local dev
- CI/CD via GitHub Actions: ruff (lint), mypy (types), pytest (tests)

### Frontend
> **Note:** The owner has zero knowledge of the React/Vite/TypeScript stack.
> All frontend code is **implemented and validated by AI** through automated test suites (Vitest, Playwright) and CI checks.
> The owner validates only that `./check.sh` passes and the Docker stack starts without errors.

- Vite + React + TypeScript app under `frontend/` with full runs list/detail views
- API client layer with `apiClient` fetch wrapper, `ApiError` class, and endpoint constants
- 108 unit tests across 18 files + Playwright E2E tests
- Containerized — multi-stage Dockerfile (node build → nginx serve) on port 3000

---

## Improvement Plan: Clean and Robust Vertical Slice

Before we scale horizontally by adding new models, we should make the existing vertical slice clean and robust. Currently, several structural abstractions (like the trainer registry and artifact storage) are bypassed or unused. Addressing these first makes adding new models trivial.

### Phase 1 — Trainer Registry & Error Handling Integration
- **1.1: Add `TrainerNotFoundError` to Exception Hierarchy**
  - **Why:** If the user specifies an invalid trainer name in the run configuration, the system should raise a structured `TrainerNotFoundError` rather than throwing a generic `KeyError`. This error should map to a clean HTTP 404/422 status code in FastAPI exception handlers.
- **1.2: Register `RandomForestClassifierTrainer` in `TrainerRegistry`**
  - **Why:** The `TrainerRegistry` is currently empty and `RandomForestClassifierTrainer` is never registered. We need to initialize/register it on startup so that it can be resolved dynamically.
- **1.3: Update Run Schema to Validate `trainer_name`**
  - **Why:** The FastAPI endpoint accepts an arbitrary `config` dict. We must validate that a valid `trainer_name` (e.g., `"random_forest"`) is provided, either in the root of the request payload or as a required key within `config`, so we can fail early on unsupported models.
- **1.4: Integrate `TrainerRegistry` dynamically in Celery Worker**
  - **Why:** The Celery task currently hardcodes the initialization of `RandomForestClassifierTrainer`. We must refactor it to resolve the trainer class dynamically from the `TrainerRegistry` based on the specified `trainer_name`, allowing new models (like XGBoost) to work automatically once registered.

### Phase 2 — Proper Storage Abstraction (Artifact Store)
- **2.1: Implement `LocalArtifactStore`**
  - **Why:** Storing trained models using raw `os.makedirs` and hardcoded paths inside the Celery worker bypasses the infrastructure abstraction. We need to implement `LocalArtifactStore` subclassing the abstract `ArtifactStore`.
- **2.2: Refactor Training Tasks to use `ArtifactStore`**
  - **Why:** Worker tasks should delegate artifact loading/saving to the `ArtifactStore`. This keeps worker logic decoupled from filesystem implementation details, allowing us to swap the storage backend to S3 (`S3Store`) in the future without changing task code.

### Phase 3 — Domain Validation & Testing
- **3.1: Add Basic Domain Validation (Experiment Exists)**
  - **Why:** Currently, runs can be created with arbitrary `experiment_id` values. Adding a stub check establishes correct service-layer validation boundaries for relational entities.
- **3.2: Write Unit and Integration Tests for Registry & Storage**
  - **Why:** We must verify robust registration/resolution, configuration validation errors, and successful/failed artifact saving/loading.

---

## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
- **AI Commits:** If a commit is made by AI or with AI assistance, the commit message must include the AI model name and state that it was generated with AI assistance. Format: `feat: description [generated with ai assistant]`. This ensures traceability of AI-generated contributions.

---

## Reading Guide

Read the project in this order to build understanding from the top down — architecture first, then data, then request flow, then training logic. Each stage unlocks the next.

---

### Stage 1 — Big Picture (Start Here)

Understand what the system does and how all its pieces connect before touching any code.

| File | What to look for |
|------|-----------------|
| `docs/architecture.md` | Layer diagram, responsibility boundaries, how API / Worker / Trainer / DB relate to each other |
| `docs/api-reference.md` | What endpoints exist, what they accept, what they return |
| `docker-compose.yml` | What services run (PostgreSQL, Redis, API, Worker, Frontend) and how they're wired together |
| `check.sh` | What quality gates exist (lint, types, tests) — these define "done" |

---

### Stage 2 — The Foundation (Shared Primitives)

These files are imported everywhere. Understanding them means you'll never be confused by a type, enum, or error you see elsewhere.

| File | What to look for |
|------|-----------------|
| `backend/shared/enums.py` | `RunStatus` enum — the possible states a training run goes through (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`) |
| `backend/shared/errors.py` | The exception hierarchy: `TrainGridError` → `NotFoundError` → `TrainingRunNotFoundError`. Every error in the system traces back here |
| `backend/shared/types.py` | Any shared type aliases used across layers |
| `backend/shared/constants.py` | Global constants |

---

### Stage 3 — Data Layer (What Gets Persisted)

Before reading any business logic, know exactly what shape the data takes in the database.

| File | What to look for |
|------|-----------------|
| `backend/infrastructure/database/models.py` | The `Run` SQLAlchemy model — every column, its type, and what it represents |
| `backend/infrastructure/database/session.py` | How the DB session is created and how SQLite (local) vs PostgreSQL (Docker) is selected |
| `backend/api/schemas/` | Pydantic schemas (`RunBase`, `RunCreate`, `RunResponse`) — the difference between what the API accepts vs what it returns |

**Key insight:** The SQLAlchemy model = database shape. The Pydantic schema = API contract. They are deliberately kept separate.

---

### Stage 4 — The Full Request Flow (Critical Path)

Trace a single request — "start a training run" — end-to-end through every layer. Read these files in order:

1. **`backend/api/main.py`** — App entry point. See how the DB, logging, exception handlers, and routers are all registered at startup.
2. **`backend/api/core/logging.py`** — How `get_logger()` works and what format structured logs take.
3. **`backend/api/core/exceptions.py`** — How `register_exception_handlers()` maps custom exceptions to HTTP status codes automatically.
4. **`backend/api/routers/runs.py`** — The `POST /runs` and `GET /runs/{id}` endpoints. Notice how thin they are — no business logic here.
5. **`backend/api/services/run_service.py`** — Where business logic lives. `create_run()` writes to DB and dispatches a Celery task. `get_run()` raises `TrainingRunNotFoundError` if missing.
6. **`backend/workers/celery_app.py`** — How Celery is configured and connected to Redis.
7. **`backend/workers/tasks/training_tasks.py`** — The async task that receives the run ID, loads the trainer, runs training, and writes results back to DB.

**The flow in one line:**
```
HTTP Request → Router → Service → DB write + Celery dispatch → Worker picks up task → Trainer runs → DB updated with result
```

---

### Stage 5 — Training Logic (The Core ML Layer)

Now that you understand how a training job is triggered, see how the actual model training works.

| File | What to look for |
|------|-----------------|
| `backend/trainers/base.py` | The `BaseTrainer` abstract class — the interface every trainer must implement |
| `backend/trainers/registry.py` | How trainers are looked up by name (e.g. `"random_forest"` → `RandomForestTrainer`) |
| `backend/trainers/configs/` | How model hyperparameters are defined without hardcoding |
| `backend/trainers/sklearn/trainer.py` | The only fully implemented trainer. Read this to understand the `train()` method contract |

**Key insight:** Adding a new model type means subclassing `BaseTrainer` and registering it in `registry.py` — nothing else changes.

---

### Bonus — Frontend & Tests

Only read these after the backend flow is clear.

| File | What to look for |
|------|-----------------|
| `frontend/src/api/` | `apiClient` fetch wrapper, `ApiError` class, endpoint constants — the frontend's contract with the backend |
| `frontend/src/features/` | Feature-based modules (runs list, run detail) — where UI logic lives |
| `frontend/src/pages/` | Page components that wire features into routes |
| `tests/api/test_runs.py` | End-to-end API tests using `TestClient` — the best single-file summary of how the API behaves |

---

### Reading Order Summary

```
docs/architecture.md
    ↓
shared/ (enums → errors → types)
    ↓
infrastructure/database/ (models → session)
    ↓
api/main.py → core/ → routers/runs.py → services/run_service.py
    ↓
workers/celery_app.py → workers/tasks/training_tasks.py
    ↓
trainers/base.py → trainers/registry.py → trainers/sklearn/trainer.py
    ↓
frontend/src/api/ → frontend/src/features/ → tests/api/test_runs.py
```
