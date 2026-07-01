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

## Current Status: Logging & Exception Handling (In Progress)
> **Currently working on:** Backend logging and exception handling to diagnose frontend connectivity issues

The first vertical slice (training a `RandomForestClassifier` on tabular CSV data) has a **functional backend** but the **frontend is not yet working** — logging and exception handling must be implemented first to diagnose root cause.

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

### Frontend (Implemented — Not Functional)
> **Note:** The owner has zero knowledge of the React/Vite/TypeScript stack.
> All frontend code is **implemented and validated by AI** through automated test suites (Vitest, Playwright) and CI checks.
> The owner validates only that `./check.sh` passes and the Docker stack starts without errors.

- [x] **Vite + React App** scaffolded under `frontend/` with TypeScript — all pages, components, and feature modules implemented.
- [x] **API Client layer** wired — `apiClient` fetch wrapper (`get`/`post`), `ApiError` class, and endpoint constants under `src/api/` (17 passing vitest tests). Frontend exception handling is **already implemented**.
- [x] **Runs list and detail views wired** — RunsPage (list+create), RunDetailPage (detail view with auto-polling).
- [x] **Containerized** — Multi-stage `Dockerfile` (node build → nginx serve), `frontend` service in `docker-compose.yml` (port 3000).
- [x] **Comprehensive test coverage** — 108 unit tests across 18 files + Playwright E2E tests.

**Known issue:** Frontend vertical slice is implemented but does not function end-to-end. Backend logging and exceptions needed to diagnose the disconnect.

---

## Week 1: Logging & Exception Handling

Both custom logging and custom exceptions exist as **unused scaffolding** in the backend. This week wires them into the actual application flow across every layer: shared errors, API exception handlers, services, routers, and Celery workers.

### Current State Audit

| File | Current State | Problem |
|------|---------------|---------|
| `shared/errors.py` | Defines `TrainGridError` → `NotFoundError` → `TrainingRunNotFoundError` hierarchy | ✅ Done — step 1.1 |
| `api/core/exceptions.py` | Defines `register_exception_handlers(app)` with 3 handlers (404, 500) | ✅ Done — step 1.2 |
| `api/core/logging.py` | `get_logger()` helper + enhanced stdout format | ✅ Done — step 2.1 |
| `api/routers/runs.py` | Simplified — no inline `if run is None` check | ✅ Done — steps 1.4/1.5 |
| `api/services/run_service.py` | `get_run()` raises `TrainingRunNotFoundError`; Celery dispatch wrapped in try/except | ✅ Done — step 1.4 |
| `workers/tasks/training_tasks.py` | Raises `TrainingRunNotFoundError` instead of silent dict | ✅ Done — step 1.6 |
| `api/main.py` | Calls `configure_logging()` and `register_exception_handlers(app)` on startup | ✅ Done — step 1.3 |

### Dependencies

- **No new packages needed** — Python `logging` is stdlib, FastAPI has built-in exception handler support
- **No new files created** — all changes are to existing files
- **One test update required** — `test_get_run_not_found` currently expects `200`; will need `404`

### Phase 1 — Exception Hierarchy & FastAPI Handlers (7 steps)

**Goal:** Consistent HTTP error responses with proper status codes. Every error returns `{"detail": {"code": "ERROR_CODE", "message": "Human-readable message"}}` with the correct HTTP status code.

- [x] 1.1 Unify exception hierarchy in `shared/errors.py`: `TrainGridError` → `NotFoundError` → `TrainingRunNotFoundError`
- [x] 1.2 Replace `api/core/exceptions.py` with FastAPI handler functions (`register_exception_handlers(app)`)
- [x] 1.3 Register exception handlers in `api/main.py`
- [x] 1.4 Update `api/services/run_service.py`: `get_run` raises `TrainingRunNotFoundError`, `create_run` wraps Celery dispatch in try/except
- [x] 1.5 Simplify `api/routers/runs.py` — remove inline `if run is None` check (exception handler returns 404)
- [x] 1.6 Update `workers/tasks/training_tasks.py` — raise `TrainingRunNotFoundError` instead of returning `{"status": "not_found"}`
- [x] 1.7 Update `tests/api/test_runs.py` — `test_get_run_not_found` expects 404 with new response format

### Phase 2 — Structured Logging (5 steps)

**Goal:** Every significant action is traceable via structured logs with component names, filenames, line numbers, and contextual fields like `run_id`.

- [x] 2.1 Enhance `api/core/logging.py` with `get_logger(name)` helper + stdout format (timestamp, level, name, filename, lineno)
- [x] 2.2 Activate logging in `api/main.py` — call `configure_logging()` at startup
- [x] 2.3 Add logging to `api/routers/runs.py` — log each endpoint call with context
- [x] 2.4 Add logging to `api/services/run_service.py` — log run creation, Celery dispatch, not-found warnings
- [x] 2.5 Add logging to `workers/tasks/training_tasks.py` — log task receipt, training start/complete/failure

### Phase 3 — Validation (3 steps)

- [ ] 3.1 Run `./check.sh` and fix any lint/type/test issues
- [ ] 3.2 Verify `GET /runs/999` returns 404 with `{"detail": {"code": "NOT_FOUND", "message": "..."}}`
- [ ] 3.3 Create a run and verify full log lifecycle in stdout

---

## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
- **AI Commits:** If a commit is made by AI or with AI assistance, the commit message must include the AI model name and state that it was generated with AI assistance. Format: `feat: description [generated with ai assistant]`. This ensures traceability of AI-generated contributions.
