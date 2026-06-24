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

- [x] **Vite + React App** scaffolded under `frontend/` with TypeScript — pages, components, and feature modules (runs, projects, experiments, models, deployments) exist as boilerplate but are **not connected to the backend API**.
- [x] **API Client layer** wired — `apiClient` fetch wrapper (`get`/`post`), `ApiError` class, and endpoint constants under `src/api/`. (17 passing vitest tests)
- [ ] **Not containerized** — no Dockerfile, no service in `docker-compose.yml`.

### Immediate Next Steps

1. **[x] API Client layer done** (`src/api/client.ts` + `endpoints.ts`). Next: wire up runs list/detail views to the `/runs/` endpoints.
2.  **Frontend containerization**: Add a `Dockerfile` for the React frontend inside `frontend/` and register it in `docker-compose.yml`.
3.  **Test coverage**: Write comprehensive tests across all layers — see [Test Coverage Plan](#test-coverage-plan).

---

## Logging & Exception Handling Plan

Both custom logging and custom exceptions exist as **unused scaffolding**. This plan wires them into the actual application flow.

### Current Problems

| Issue | Where | Impact |
|-------|-------|--------|
| `GET /runs/999999` returns `200 OK` with `{"error": "..."}` instead of `404` | `api/routers/runs.py` | Breaks HTTP semantics; clients get no status code signal |
| `run_service.py` returns `None` instead of raising an exception | `api/services/run_service.py` | Every caller needs `if result is None` boilerplate |
| `configure_logging()` is never called | `api/core/logging.py` | Dead code; no component logs anything |
| No structured log format or request IDs | `api/core/logging.py` | Hard to trace actions across services |

### Phase 1: Custom Exceptions

**Goal:** Consistent HTTP error responses with proper status codes.

| Step | File | Change |
|------|------|--------|
| 1 | `shared/errors.py` | Move `TrainGridError` here as shared base class; keep `NotFoundError` |
| 2 | `api/core/exceptions.py` | Add FastAPI exception handlers for `NotFoundError` (→ 404) and `TrainGridError` (→ 500), returning `{"detail": {"code": "...", "message": "..."}}` |
| 3 | `api/core/exceptions.py` | Add `TrainingRunNotFoundError` (404) for run-specific lookups |
| 4 | `api/services/run_service.py` | `get_run` raises `NotFoundError` / `TrainingRunNotFoundError` instead of returning `None` |
| 5 | `api/routers/runs.py` | Remove inline `if run is None: return {"error": ...}` — let exception flow to handler |
| 6 | `api/main.py` | Import and register exception handlers on the app |
| 7 | `api/services/run_service.py` | `create_run` wraps Celery dispatch in try/except, raises on failure |
| 8 | `workers/tasks/training_tasks.py` | Raise `TrainingRunNotFoundError` when run_id is missing from DB |

**Result:** Every endpoint returns consistent `{"detail": {"code": "NOT_FOUND", "message": "..."}}` with the correct HTTP status code.

### Phase 2: Custom Logging

**Goal:** Every significant action is traceable via structured logs.

| Step | File | Change |
|------|------|--------|
| 1 | `api/core/logging.py` | Add `get_logger(name)` helper; add `filename` and `lineno` to format; support structured `extra` fields |
| 2 | `api/main.py` | Call `configure_logging()` at the top of `create_app()` |
| 3 | `api/services/run_service.py` | `logger.info("Run created", extra={"run_id": ..., "experiment_id": ...})` on create |
| 4 | `api/routers/runs.py` | `logger.info("GET /runs/{run_id}")` on requests |
| 5 | `workers/tasks/training_tasks.py` | `logger.info` on start/complete, `logger.error` on failure (include `run_id`, `error` in extras) |
| 6 | `api/core/exceptions.py` | `logger.exception()` in exception handlers to capture stack traces |

**Result:** Run creation, training lifecycle events, and all errors appear in logs with context fields for filtering.

### Impact on Existing Tests

The `test_get_run_not_found` test in `tests/api/test_runs.py` must be updated: it currently expects `200` + `{"error": "Run not found"}`, but after Phase 1 it will get `404` + `{"detail": {"code": "NOT_FOUND", ...}}`.

### Dependencies

- No new packages needed (Python `logging` is stdlib, FastAPI has built-in exception handler support)
- Changes are scoped to existing files only — no new files created


---

## Test Coverage Plan

Comprehensive test plan for all backend implementations, organized by layer.

**Run tests with:** `./check.sh` (runs ruff format, ruff check, mypy, then pytest)

### Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

### Phase 1: Shared & Infrastructure Layer (pure unit tests, no DB)

| File | Tests | Status |
|------|-------|--------|
| `tests/shared/test_enums.py` | RunStatus/DeploymentStatus values, str enum behavior | `[ ]` |
| `tests/shared/test_errors.py` | NotFoundError message and exception hierarchy | `[ ]` |
| `tests/shared/test_constants.py` | APP_NAME == "TrainGrid" | `[ ]` |
| `tests/infrastructure/test_database_models.py` | RunModel default status, table name, columns | `[ ]` |
| `tests/infrastructure/test_artifact_store.py` | ABC cannot be instantiated, abstract methods raise | `[ ]` |

**Total Phase 1: ~12 tests across 5 files**

---

### Phase 2: Trainer Layer (unit tests, no DB)

| File | Tests | Status |
|------|-------|--------|
| `tests/trainers/test_base.py` | BaseTrainer ABC cannot be instantiated, abstract methods | `[ ]` |
| `tests/trainers/test_registry.py` | register/get, KeyError for unknown, singleton instance | `[ ]` |
| `tests/trainers/test_sklearn_config.py` | RandomForestClassifierConfig defaults and custom values | `[ ]` |
| `tests/trainers/test_sklearn_trainer.py` | Initialization, pre-train guards (evaluate/save) | `[ ]` |
| `tests/trainers/test_configs_base.py` | TrainerConfig forbids extra fields | `[ ]` |
| `tests/trainers/test_configs_classification.py` | ClassificationConfig requires target_column | `[ ]` |
| `tests/trainers/test_configs_regression.py` | RegressionConfig requires target_column | `[ ]` |

**Total Phase 2: ~18 tests across 7 files**

---

### Phase 3: API Layer (schemas, services, routers, core)

| File | Tests | Status |
|------|-------|--------|
| `tests/api/test_schemas_run.py` | RunCreate valid/missing-field validation, Run response from_attributes | `[ ]` |
| `tests/api/test_run_service.py` | RunService create/get/get_all with mocked DB | `[ ]` |
| `tests/api/test_runs.py` *(expand)* | Add: valid-run GET, invalid POST validation, list-after-create | `[ ]` |
| `tests/api/test_core_config.py` | Settings defaults and env override | `[ ]` |
| `tests/api/test_core_exceptions.py` | TrainGridError raise/catch and inheritance | `[ ]` |

**Total Phase 3: ~18 tests across 5 files**

---

### Phase 4: Worker Layer

| File | Tests | Status |
|------|-------|--------|
| `tests/workers/test_celery_app.py` | Celery app name and config from settings | `[ ]` |
| `tests/workers/test_training_tasks.py` | Not-found, success, failure, timestamps | `[ ]` |

**Total Phase 4: ~6 tests across 2 files**

---

### Phase 5: Test Infrastructure (fixtures)

| File | Purpose | Status |
|------|---------|--------|
| `tests/conftest.py` | db_session (in-memory SQLite), run_service, sample payload fixtures | `[ ]` |
| `tests/api/conftest.py` | TestClient with dependency override for test DB | `[ ]` |

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

The frontend build configuration is **complete** and the API client layer is **implemented + tested**. Build config files (`vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vite-env.d.ts`, `vitest.config.ts`) now exist, all necessary packages are installed, and CI runs frontend checks (`tsc`, `vitest`, `build`). Every other file under `frontend/src/` still has only stub comments.

| File | Status |
|------|--------|
| `src/api/client.ts`, `endpoints.ts` | **Implemented + tested** (17 vitest tests) |
| `src/features/runs/` (api, types, hooks) | `types.ts` tested (15 tests); `api.ts` tested (12 tests); `hooks.ts` still stub |
| `src/pages/RunsPage.tsx`, `RunDetailPage.tsx` | Empty stubs |
| `src/components/ui/*` | Implemented (8 components + 8 test files) — vitest + `tsc --noEmit` + build all pass |
| `src/components/layout/*` (Sidebar, Topbar, PageHeader) | Empty stubs (3 files) |
| `src/app/routes.tsx`, `layout.tsx`, `providers.tsx` | Empty stubs |
| `src/App.tsx` | Renders `<div>TrainGrid</div>` only |
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
| **6. Layout Components** | `Sidebar` (nav links), `Topbar` (app name), `PageHeader` (title+description) | `frontend/src/components/layout/*.tsx` | vitest (render) |
| **7. Routing & Shell** | React Router routes, app shell with Sidebar+Topbar+`<Outlet>`, QueryClient provider | `frontend/src/app/routes.tsx`, `layout.tsx`, `providers.tsx` | `npm run build` |
| **8. Runs List Page** | `RunsPage`: table of all runs, create-run modal with form fields, status badges, row click → detail | `frontend/src/pages/RunsPage.tsx` | vitest + Playwright |
| **9. Run Detail Page** | `RunDetailPage`: single run view, auto-polling every 3s while PENDING/RUNNING, config+metrics display | `frontend/src/pages/RunDetailPage.tsx` | vitest + Playwright |
| **10. Dashboard Page** | `DashboardPage`: summary cards with run counts by status | `frontend/src/pages/DashboardPage.tsx` | vitest |
| **11. App Wiring** | Wire providers + router in `main.tsx`, `App.tsx` renders the app | `frontend/src/main.tsx`, `frontend/src/App.tsx` | `npm run build` |
| **12. Containerization** | Multi-stage `Dockerfile` (node build → nginx serve), `frontend` service in `docker-compose.yml` (port 3000) | `frontend/Dockerfile`, `docker-compose.yml` | `docker compose up frontend` |
| **13. Frontend Tests** | `vitest.config.ts`, unit tests for components/api/hooks, Playwright E2E for runs flow, integrate into `./check.sh` | `frontend/vitest.config.ts`, `frontend/src/**/*.test.tsx`, `frontend/e2e/` | `./check.sh` passes |

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
