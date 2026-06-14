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
uvicorn api.main:app --reload

Start worker:
celery -A workers.celery_app worker --loglevel=info

## Rules
- Use async FastAPI endpoints where possible
- Follow strict OOP principles and keep production-grade code quality
- Keep trainer classes modular
- Do not hardcode model configs
- **Planning:** ALWAYS provide a plan and the proposed code in the chat before making any actual code changes. Do not execute code changes without prior approval.
- **Communication:** After every code change or implementation step, provide a concise explanation of WHAT was changed and WHY it was put in that specific file/directory. This is crucial for learning the architecture.
- **Command Execution:** Always run commands one by one and avoid executing multiple commands in a single step (e.g., avoid joining commands with `;` or `&&`).
- **Validation:** Before completing any task, you MUST run the project's quality checks as defined in the CI workflow:
    1. `ruff format .` (to fix formatting)
    2. `ruff check .` (to lint)
    3. `mypy .` (to type check)
    4. `pytest` (to run tests)

## Current Status: Vertical Slice - Tabular Training
We are implementing the first "Vertical Slice" of the platform: training a `RandomForestClassifier` on tabular CSV data.

### Completed Milestones
- [x] **Architecture defined** in `docs/architecture.md`.
- [x] **RandomForest Trainer** implemented in `trainers/sklearn/`.
- [x] **Database Model** for Runs created in `infrastructure/database/models.py`.
- [x] **API Schemas** (Pydantic) defined in `api/schemas/run.py`.

### Immediate Next Steps
1.  **Run Service** (`api/services/run_service.py`): Implement logic to create runs and trigger Celery tasks.
2.  **API Router** (`api/routers/runs.py`): Expose endpoints to start and track runs.
3.  **Celery Task** (`workers/tasks/training_tasks.py`): Update the task to use the trainer and save results to the DB.

## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
