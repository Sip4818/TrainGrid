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
- **Validation:** Before completing any task, you MUST run the project's quality checks by executing `.\check.ps1`.

## Current Status: Vertical Slice - Tabular Training
We are implementing the first "Vertical Slice" of the platform: training a `RandomForestClassifier` on tabular CSV data.

### Completed Milestones
- [x] **Architecture defined** in `docs/architecture.md`.
- [x] **RandomForest Trainer** implemented in `trainers/sklearn/`.
- [x] **Database Model** for Runs created in `infrastructure/database/models.py`.
- [x] **API Schemas** (Pydantic) defined in `api/schemas/run.py`.
- [x] **Run Service** (`api/services/run_service.py`): Logic to create runs and trigger Celery tasks.
- [x] **API Router** (`api/routers/runs.py`): Endpoints to start and track runs.
- [x] **Celery Task** (`workers/tasks/training_tasks.py`): Connects trainer and saves results to DB.
- [x] **Backend Initialization** (`api/main.py`): DB table creation and router registration.
- [x] **API Tests** (`tests/api/test_runs.py`): End-to-end tests for the `/runs` endpoints using `TestClient`.

### Immediate Next Steps

1.  **Containerization**: Add a single `Dockerfile` for the backend (shared by FastAPI and Celery) and a basic `Dockerfile` for the React frontend. Create a `docker-compose.yml` that pulls official pre-made images for Redis and PostgreSQL (replacing SQLite to avoid database lock errors during parallel training runs). Use Docker volumes to enable code live-reloading so you can modify model training logic instantly without rebuilding images. No complex multi-stage optimization or advanced build layers are needed for this first slice.
2.  **CI/ CD**: Setup a minimal GitHub Actions workflow that handles linting, runs your validation script (`.\check.ps1`), and executes basic `docker build` and `docker push` commands to upload your backend image to Docker Hub. Avoid advanced orchestration setups like matrix builds, multi-architecture compiling, or automated cloud deployments at this stage.
3.  **Test Cases**: Focus strictly on high-value end-to-end (E2E) smoke testing. Write integration tests for the `/runs` endpoint that accept a dummy tabular CSV payload and verify that a 202 status code is returned. Do not write complex unit tests for scikit-learn's internal math libraries or deep database mocks.
4.  **Frontend Dashboard** (`frontend/`): Scaffold a dead-simple Vite + React application. Create a basic HTML upload form with a file input component to select tabular CSV data and a submit button that fires a standard JavaScript `fetch()` request directly to your backend API. Avoid state management libraries, complex routing architectures, or UI styling frameworks.
5.  **Front end containerization**: Add the React development container into the master `docker-compose.yml` file using a standard, unoptimized Node base image. Map your local frontend folder via Docker volumes so UI modifications reflect in the browser instantly without requiring container restarts.



## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.

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
celery -A workers.celery_app worker --loglevel=info

## Rules
- Use async FastAPI endpoints where possible
- Follow strict OOP principles and keep production-grade code quality
- Keep trainer classes modular
- Do not hardcode model configs
- **Planning:** ALWAYS provide a plan and the proposed code in the chat before making any actual code changes. Do not execute code changes without prior approval.
- **Communication:** After every code change or implementation step, provide a concise explanation of WHAT was changed and WHY it was put in that specific file/directory. This is crucial for learning the architecture.
- **Command Execution:** Always run commands one by one and avoid executing multiple commands in a single step (e.g., avoid joining commands with `;` or `&&`).
- **Validation:** Before completing any task, you MUST run the project's quality checks by executing `.\check.ps1`.

## Current Status: Vertical Slice - Tabular Training
We are implementing the first "Vertical Slice" of the platform: training a `RandomForestClassifier` on tabular CSV data.

### Completed Milestones
- [x] **Architecture defined** in `docs/architecture.md`.
- [x] **RandomForest Trainer** implemented in `trainers/sklearn/`.
- [x] **Database Model** for Runs created in `infrastructure/database/models.py`.
- [x] **API Schemas** (Pydantic) defined in `api/schemas/run.py`.
- [x] **Run Service** (`api/services/run_service.py`): Logic to create runs and trigger Celery tasks.
- [x] **API Router** (`api/routers/runs.py`): Endpoints to start and track runs.
- [x] **Celery Task** (`workers/tasks/training_tasks.py`): Connects trainer and saves results to DB.
- [x] **Backend Initialization** (`api/main.py`): DB table creation and router registration.
- [x] **API Tests** (`tests/api/test_runs.py`): End-to-end tests for the `/runs` endpoints using `TestClient`.

### Immediate Next Steps
1.  **Frontend Dashboard** (`frontend/`): Scaffold the React frontend and build the tabular training run submission form.
2.  **Containerization**: Add Dockerfiles for the backend (FastAPI + Celery) and the React frontend, and create a `docker-compose.yml` that brings up Redis, the backend, a Celery worker, and a persistent SQLite volume.


## Development Workflows
- **API Changes:** Always create both a SQLAlchemy model and a Pydantic schema (Base, Create, and Response) to maintain separation of concerns.
- **Training Logic:** Keep it inside the `trainers/` directory, decoupled from the API and Workers.
- **Commits:** Use `feat:`, `fix:`, or `docs:` prefixes. Push changes after successful implementation of a component.
