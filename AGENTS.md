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

## Known Issues

- **Playwright E2E tests fail in `./check.sh` (local only):** The E2E tests require the frontend dev server to be running on `localhost:3000`, but `check.sh` does not start it, so the Playwright step stays commented out in `check.sh`. **Fixed in CI** — the `e2e-tests` job in `.github/workflows/ci.yml` starts the Docker Compose stack, seeds a training run, and runs `npx playwright test`; all 4 tests pass there.
  - See `frontend/e2e/runs.spec.ts` — all 4 tests fail locally with `net::ERR_CONNECTION_REFUSED` when no server is available.
- **Unnecessary `async` on exception handlers in `backend/api/core/exceptions.py`:** The three handler functions (`handle_traingrid_error`, `handle_not_found`, `handle_generic_error`) are declared `async` but never `await` anything — they only return a `JSONResponse`. FastAPI accepts both sync and async handlers, so these signatures work, but the `async` keyword is misleading. They should either be sync functions or should be removed if there's no I/O planned. Low priority — purely cosmetic.

## Current Status

The backend is fully instrumented and the frontend connects correctly — training runs can be created, tracked, and viewed end-to-end.

### Backend
- FastAPI + SQLAlchemy + Celery fully wired with structured logging and exception handling
- Errors return `{"detail": {"code": "...", "message": "..."}}` with correct HTTP status codes
- RandomForest (`trainers/sklearn/`) and XGBoost (`trainers/xgboost/`) trainers implemented and registered in the `TrainerRegistry` via self-registration + auto-discovery (`backend/trainers/registration.py`); each exposes a `label` and a Pydantic `config_class`
- `GET /trainers/` endpoint (`backend/api/routers/models.py`) lists registered trainers with labels and config JSON schemas — the single source of truth for the frontend model dropdown, so adding a trainer requires no frontend changes
- Containerized via Docker Compose (PostgreSQL + Redis + API + Worker); SQLite used for local dev
- CI/CD via GitHub Actions: ruff (lint), mypy (types), pytest (backend tests), Vitest (frontend unit tests), and Playwright E2E tests (Docker Compose stack)

### Frontend
> **Note:** The frontend is built in React/Vite/TypeScript. The owner has
> worked through the codebase to understand the architecture — hooks (and why
> they are used), the typed API client layer (`apiClient`, `ApiError`, endpoint
> constants), and how pages wire features/components together through hooks.
> All frontend code is validated via automated test suites (Vitest, Playwright)
> and CI checks.

- Vite + React + TypeScript app under `frontend/` with full runs list/detail views
- API client layer with `apiClient` fetch wrapper, `ApiError` class, and endpoint constants
- Create-run modal has a backend-driven Model dropdown (`useTrainers()` → `GET /trainers/`, with a hardcoded fallback); config inputs are model-conditional (e.g. `learning_rate` only for XGBoost) and empty optional fields are omitted so Pydantic defaults apply
- 118 unit tests across 18 files + Playwright E2E tests
- Containerized — multi-stage Dockerfile (node build → nginx serve) on port 3000

### Active Issues
- **#19** — Project & experiment management hierarchy (Week 5 work)
- **#20** — Schema-driven config form generated from trainer schemas (supersedes the config portion of #18)

---

## Improvement Plan: Clean and Robust Vertical Slice

Before we scale horizontally by adding new models, we should make the existing vertical slice clean and robust. Currently, several structural abstractions (like the trainer registry and artifact storage) are bypassed or unused. Addressing these first makes adding new models trivial.

### Phase 1 — Trainer Registry & Error Handling Integration
- **1.1: ✅ Add `TrainerNotFoundError` to Exception Hierarchy**
  - **Why:** If the user specifies an invalid trainer name in the run configuration, the system should raise a structured `TrainerNotFoundError` rather than throwing a generic `KeyError`. This error should map to a clean HTTP 404/422 status code in FastAPI exception handlers. `TrainerNotFoundError` lives in `backend/shared/errors.py` and `handle_traingrid_error` maps it to HTTP 422 (`backend/api/core/exceptions.py`).
- **1.2: ✅ Register `RandomForestClassifierTrainer` in `TrainerRegistry`** — [issue #3]
  - **Why:** The `TrainerRegistry` is currently empty and `RandomForestClassifierTrainer` is never registered. We need to initialize/register it on startup so that it can be resolved dynamically. Implemented via self-registration + auto-discovery — `backend/trainers/registration.py` exposes `register_all()` (called from both `backend/api/main.py` and `backend/workers/celery_app.py`), and each trainer module self-registers on import. `get("random_forest")` resolves correctly and `get("unknown")` raises `TrainerNotFoundError`.
- **1.3: ✅ Update Run Schema to Validate `trainer_name`**
  - **Why:** The FastAPI endpoint accepts an arbitrary `config` dict. We must validate that a valid `trainer_name` (e.g., `"random_forest"`) is provided, either in the root of the request payload or as a required key within `config`, so we can fail early on unsupported models. `RunCreate` now requires `trainer_name` (`backend/api/schemas/run.py`), `RunService.create_run` resolves it against the `TrainerRegistry` (`backend/api/services/run_service.py`), and an unknown trainer returns HTTP 422 with `{"code": "TRAINER_NOT_FOUND"}` (`backend/api/core/exceptions.py`). Covered by `test_create_run_unknown_trainer` in `tests/api/test_runs.py`.
- **1.4: ✅ Integrate `TrainerRegistry` dynamically in Celery Worker** — [issue #6]
  - **Why:** The Celery task currently hardcodes the initialization of `RandomForestClassifierTrainer`. We must refactor it to resolve the trainer class dynamically from the `TrainerRegistry` based on the specified `trainer_name`, allowing new models (like XGBoost) to work automatically once registered. `BaseTrainer` now declares a `config_class` contract (`backend/trainers/base.py`), `RandomForestClassifierTrainer` sets it (`backend/trainers/sklearn/trainer.py`), and `start_training_run` resolves both via `trainer_registry.get(trainer_name)` + `trainer_cls.config_class(**config)` (`backend/workers/tasks/training_tasks.py`). Covered by `test_start_training_run_resolves_trainer_via_registry` in `tests/workers/test_training_tasks.py`.

### Phase 2 — Proper Storage Abstraction (Artifact Store)
- **2.1: ✅ Implement `LocalArtifactStore`** — [issue #8]
  - **Why:** Storing trained models using raw `os.makedirs` and hardcoded paths inside the Celery worker bypasses the infrastructure abstraction. We need to implement `LocalArtifactStore` subclassing the abstract `ArtifactStore`. `LocalArtifactStore` (`backend/infrastructure/storage/local_store.py`) stores under `settings.artifact_root` (`backend/api/core/config.py`) and exposes `save()`/`load()` as a transport contract that returns store-relative keys (e.g. `runs/{id}/model.joblib`). Covered by `tests/infrastructure/test_local_store.py`.
- **2.2: ✅ Refactor Training Tasks to use `ArtifactStore`** — [issue #8]
  - **Why:** Worker tasks should delegate artifact loading/saving to the `ArtifactStore`. This keeps worker logic decoupled from filesystem implementation details, allowing us to swap the storage backend to S3 (`S3Store`) in the future without changing task code. `start_training_run` now writes the model to a temp file, saves it via `local_artifact_store.save()`, and persists the store-relative key in `run.artifact_path` (`backend/workers/tasks/training_tasks.py`). Design rationale documented in `docs/architecture.md` (Infrastructure Layer).

### Phase 3 — Domain Validation & Testing
- **3.1: ✅ Add Basic Domain Validation (Experiment Exists)** — [issue #10]
  - **Why:** Currently, runs can be created with arbitrary `experiment_id` values. Adding a stub check establishes correct service-layer validation boundaries for relational entities. `ExperimentModel` (`backend/infrastructure/database/models.py`) and `ExperimentNotFoundError` (`backend/shared/errors.py`) were added; `RunService._validate_experiment` rejects unknown `experiment_id` with HTTP 404 (`backend/api/services/run_service.py`). A default experiment is seeded on startup (`backend/infrastructure/database/seed.py`, wired in `backend/api/main.py`) so the current frontend flow (default `experiment_id=1`) keeps working until Week 5 adds experiment CRUD. Covered by `test_create_run_unknown_experiment` in `tests/api/test_runs.py`.
- **3.2: ✅ Write Unit and Integration Tests for Registry & Storage** — [issue #12]
  - **Why:** We must verify robust registration/resolution, configuration validation errors, and successful/failed artifact saving/loading. Covered by `tests/trainers/test_registry.py` (register/get, unknown trainer, fresh instance), `tests/trainers/test_registration.py` (auto-discovery resolves `random_forest`), `tests/trainers/test_configs.py` (required fields, unknown keys, defaults), and failure-path tests in `tests/infrastructure/test_local_store.py`.

### Phase 4 — Frontend Status Filtering (Dashboard to Runs List) — [issue #14]
- **4.1: ✅ Update Dashboard Summary Card Navigation**
  - **Why:** Clicking status summary cards on the dashboard should not just navigate to `/runs` unconditionally. It should pass the selected status as a query parameter (e.g., `/runs?status=failed`), except for the "Total" card. Implemented in `DashboardPage.tsx` — the card `onClick` now builds `/runs?status=<status>` for real status cards and keeps plain `/runs` for "Total".
- **4.2: ✅ Parse Status Query Parameter in RunsPage**
  - **Why:** The `RunsPage` needs to extract the active status filter from the URL query parameters using React Router's `useSearchParams` hook. `RunsPage.tsx` reads `status`, validates it against the `RunStatus` enum (invalid values are ignored), and derives the active filter from it.

### Phase 5 — Interactive Runs List Filter UI & Testing — [issue #14]
- **5.1: ✅ Filter the Runs Table Data Source**
  - **Why:** The frontend table needs to only render runs matching the parsed status filter. `RunsPage.tsx` filters the already-fetched `runs` array client-side (`filteredRuns`) and passes it to the `<Table>` — no API or backend change needed since all runs are already loaded.
- **5.2: ✅ Add a Filter Dropdown Selector to the Runs Page**
  - **Why:** Users need a simple select box in the Runs Page header to clear, inspect, or modify the active status filter directly without having to navigate back to the dashboard. Implemented with the existing `Select` UI component in the `PageHeader`; it writes back to the same `status` URL param so the URL stays the single source of truth.
- **5.3: ✅ Update Frontend Unit and E2E Tests**
  - **Why:** We must verify navigation, search parameter parsing, filtering behavior, and verify the frontend build and test suites pass successfully. Covered by new tests in `DashboardPage.test.tsx`, `RunsPage.test.tsx`, and a dashboard → filtered-runs flow in `frontend/e2e/runs.spec.ts`.

### Phase 6 — Model Selection & Trainer Discovery — [issues #18, #20]
- **6.1: ✅ Model dropdown in the create-run modal** — [issue #18]
  - **Why:** The create-run modal hardcoded `trainer_name: "random_forest"`, so users could never pick a model. The modal now has a Model dropdown defaulting to Random Forest, shows `learning_rate` only when XGBoost is selected, and omits empty optional config fields so the backend's Pydantic defaults apply (required because XGBoost's `max_depth` is a non-optional `int`). Covered by new create-flow tests in `RunsPage.test.tsx`.
- **6.2: ✅ `GET /trainers/` endpoint (backend-driven dropdown)** — [issue #18]
  - **Why:** The dropdown options must not be hardcoded in the frontend. `GET /trainers/` (`backend/api/routers/models.py`) serializes the `TrainerRegistry` — each trainer's `name`, `label`, and Pydantic `config_schema` — and the frontend `useTrainers()` hook sources the dropdown from it (with a fallback list if the endpoint is unavailable). Adding a trainer (self-registering module) makes it appear automatically with no DB or frontend changes. Covered by `tests/api/test_models.py`.
- **6.3: ⏳ Schema-driven config form** — [issue #20]
  - **Why:** The config inputs in the create modal are still hardcoded/conditional. #20 will generate them from each trainer's `config_schema` (already returned by `GET /trainers/`) so new models need zero frontend changes. Supersedes the config portion of #18.

---

## Development Workflows
- **Change Workflow:** For every change, follow this process instead of pushing directly to `main`:
  1. **Create an issue** describing the work (so progress is tracked).
  2. **Create a new branch** (e.g. `feat/...`) for the change.
  3. **Create a PR** from the branch to `main`, referencing the issue.
  4. **Merge only if CI passes** — never merge a PR with failing checks.
- **No Plan Numbers in Issues, Commits, or PRs:** Never reference phase numbers, week numbers, or step identifiers (e.g., "1.3", "Phase 2", "Week 3", "3.2") in issue titles/bodies, commit messages, or PR titles/bodies. Months later these numbers mean nothing. Use descriptive, self-explanatory names (e.g., "Validate experiment exists when creating a run"). Plan numbering is only for internal tracking in AGENTS.md — it never leaves this file.
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes.
- **One Commit Per File Change:** Each file change must be committed separately — never bundle multiple files into a single commit. If lint auto-fixes touch several files after the fact, commit them as a single `style:` pass.
- **Merging:** Always merge with a merge commit — **never squash**. Each per-file commit must be preserved in `main` history.


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

**Note on `get_db()` and `yield`:** `get_db()` in `session.py` uses `yield` instead of `return` because FastAPI supports **dependencies with teardown**. The code before `yield` runs as setup (creates the session), the handler runs, then the code after `yield` runs as cleanup (`db.close()`). This guarantees the session is always returned to the pool, even if the handler crashes. If we used `return`, nobody would ever call `db.close()` — leaking connections.

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
| `backend/trainers/registration.py` | Auto-discovery: `register_all()` imports every trainer module; each module self-registers on import |
| `backend/trainers/configs/` | How model hyperparameters are defined without hardcoding |
| `backend/trainers/sklearn/trainer.py` | The reference implementation. Read this to understand the `train()` method contract |
| `backend/trainers/xgboost/trainer.py` | Second trainer — same contract, adds a `learning_rate` hyperparameter |
| `backend/api/routers/models.py` | `GET /trainers/` — lists registered trainers (name, label, config JSON schema) for the frontend model dropdown |

**Key insight:** Adding a new model type means subclassing `BaseTrainer` and adding a self-registration line in the new trainer module — `register_all()` discovers it automatically. Nothing else changes.

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

---

## August 2026 Monthly Plan — "Vertical Slice to Multi-Model Platform"

### Week 1 — Project Understanding
- Read `docs/architecture.md`, `docs/api-reference.md`, and AGENTS.md reading guide (stages 1–5) in order
- Explore `backend/shared/`, `backend/infrastructure/database/`, `backend/api/`, `backend/workers/`, `backend/trainers/`
- Run backend (`uvicorn`), worker (`celery`), and frontend locally
- Explore `frontend/` structure and `tests/`
- Run `./check.sh` to see current quality gates
- Note any unclear areas to address in Week 2

### Week 2 — Complete Phases 1–3 (Backend Improvements) — [issues #3, #6, #8, #10, #12]
- ✅ Add `TrainerNotFoundError` to exception hierarchy
- ✅ Register `RandomForestClassifierTrainer` in `TrainerRegistry`
- ✅ Update run schema to validate `trainer_name`
- ✅ Integrate `TrainerRegistry` dynamically in Celery worker
- ✅ Implement `LocalArtifactStore`
- ✅ Refactor training tasks to use `ArtifactStore`
- ✅ Add experiment existence validation
- ✅ Write unit/integration tests for registry + storage

### Week 3 — Complete Phases 4–5 (Frontend Filtering + Testing) — [issue #14]
- ✅ Update dashboard summary cards to pass `?status=` query param
- ✅ Parse status filter from URL in `RunsPage`
- ✅ Filter runs table by active status
- ✅ Add filter dropdown selector to runs page
- ✅ Update frontend unit tests + Playwright E2E tests
- ✅ Run full `./check.sh` — green across lint, types, tests

### Week 4 — Multi-Model Platform (XGBoost + Model Selection)
- ✅ Implement `XGBoostClassifierTrainer` (subclass `BaseTrainer`, config, register in registry) — issue #16
- ✅ Model dropdown in the create-run modal + `GET /trainers/` endpoint, so the dropdown is backend-driven — issue #18
- ⏳ Schema-driven config form generated from each trainer's `config_schema` — issue #20 (supersedes the config portion of #18)
- ⏳ Add `GET /runs/compare` endpoint (accept multiple run IDs, return metrics side-by-side) — remaining scope of issue #16
- ⏳ Add comparison UI page in frontend (select runs, view metrics table) — remaining scope of issue #16
- ✅ Tests for XGBoost trainer; ⏳ tests for comparison endpoint + frontend comparison view

### Week 5 — Experiment Management Hierarchy — [issue #19]
- Implement `Project` and `Experiment` SQLAlchemy models + Pydantic schemas
- Implement CRUD `/projects` and `/experiments` endpoints
- Update `POST /runs` to validate `experiment_id` against real experiments
- Frontend: Projects list → Experiments list → Runs list drill-down navigation
- Tests for new endpoints + frontend navigation
- Final `./check.sh` + Docker compose smoke test
