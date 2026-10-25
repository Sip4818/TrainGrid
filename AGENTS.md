# AGENTS.md

## Project Overview
TrainGrid is an ML orchestration platform for training,
tracking, and deploying ML models.

## Architecture
- api/ -> FastAPI backend
- workers/ -> Celery workers
- trainers/ -> model-specific training logic
- infrastructure/ -> database, storage, queue, and tracking adapters
- mcp-server/ -> MCP tool server that talks to the API over HTTP

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

- **Unnecessary `async` on exception handlers in `backend/api/core/exceptions.py`:** The three handler functions (`handle_traingrid_error`, `handle_not_found`, `handle_generic_error`) are declared `async` but never `await` anything — they only return a `JSONResponse`. FastAPI accepts both sync and async handlers, so these signatures work, but the `async` keyword is misleading. They should either be sync functions or should be removed if there's no I/O planned. Low priority — purely cosmetic.

## Current Status

The backend is fully instrumented — training runs can be created, tracked, and inspected end-to-end through the HTTP API, OpenAPI docs, and the MCP server.

### Backend
- FastAPI + SQLAlchemy + Celery fully wired with structured logging and exception handling
- Errors return `{"detail": {"code": "...", "message": "..."}}` with correct HTTP status codes
- RandomForest (`trainers/sklearn/`) and XGBoost (`trainers/xgboost/`) trainers implemented and registered in the `TrainerRegistry` via self-registration + auto-discovery (`backend/trainers/registration.py`); each exposes a `label` and a Pydantic `config_class`
- `GET /trainers/` endpoint (`backend/api/routers/models.py`) lists registered trainers with labels and config JSON schemas — the single source of truth for any client
- 217 pytest tests across API, workers, trainers, infrastructure, and MCP
- Containerized via Docker Compose (PostgreSQL + Redis + API + Worker + MCP server); SQLite used for local dev
- CI/CD via GitHub Actions: ruff (lint), mypy (types), pytest (backend tests), an integration job (Docker Compose stack, MCP contract check, API run-lifecycle smoke), and an S3/LocalStack artifact test

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

## Templates

### Issue Template

```markdown
## Problem
[Describe the bug, gap, or missing capability cleanly]

## Goal
[State what victory looks like in 1-2 sentences]

## Scope
[Detailed breakdown of what needs to be implemented across layers/components]

### Part / Layer 1: [Name]
- [Details]

**Files affected:**
- `path/to/file`

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] All existing tests pass (`pytest`) and `./check.sh` is green.
- [ ] New tests added covering the new functionality.

## Out of Scope
- [Explicit non-goals]
```

### Pull Request Template

```markdown
## Description
[Brief summary of WHAT was changed and WHY]

## Related Issue
Closes #[Issue Number]

## Changes Made
- [List specific changes per directory/file]

## How Has This Been Tested?
- [ ] Ran `./check.sh` locally (linting, type checking, unit tests passed)
- [ ] Added new unit/integration tests for changes
- [ ] Verified manually end-to-end / via UI / via curl

## Architectural Impact & Rationale
[Brief explanation of architectural decisions, location of new files, or design patterns used]

## Checklist
- [ ] I have followed the project guidelines in `AGENTS.md`.
- [ ] No phase/week/step plan numbers are referenced in this PR title or body.
- [ ] Each file change is committed individually (or clean style pass).
- [ ] CI checks are green.
```

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
| `docker-compose.yml` | What services run (PostgreSQL, Redis, API, Worker, MCP server) and how they're wired together |
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
| `backend/api/routers/models.py` | `GET /trainers/` — lists registered trainers (name, label, config JSON schema) for any client |

**Key insight:** Adding a new model type means subclassing `BaseTrainer` and adding a self-registration line in the new trainer module — `register_all()` discovers it automatically. Nothing else changes.

---

### Bonus — Tests

Only read these after the backend flow is clear.

| File | What to look for |
|------|-----------------|
| `tests/api/test_runs.py` | End-to-end API tests using `TestClient` — the best single-file summary of how the API behaves |
| `tests/mcp/` | MCP server protocol and client contract tests |

---

