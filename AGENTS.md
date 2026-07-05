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

## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
- **AI Commits:** If a commit is made by AI or with AI assistance, the commit message must include the AI model name and state that it was generated with AI assistance. Format: `feat: description [generated with ai assistant]`. This ensures traceability of AI-generated contributions.
