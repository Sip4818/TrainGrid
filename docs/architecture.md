# TrainGrid Architecture

TrainGrid is organized as a layered ML orchestration platform. The main goal of
the structure is to keep HTTP handling, background jobs, training logic, and
external infrastructure concerns separate.

## Top-Level Structure

```text
api/              FastAPI backend and HTTP request handling
workers/          Celery app and background task definitions
trainers/         Model-specific training logic and trainer registry
domain/           Core entities and repository interfaces
infrastructure/   Database, storage, queue, and tracking integrations
shared/           Common constants, enums, errors, and shared types
frontend/         React dashboard UI
tests/            Automated tests organized by layer
docs/             Project documentation and durable design context
```

## Request Flow

Typical training flow:

```text
frontend
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

The `api/` package contains the FastAPI application.

```text
api/main.py              FastAPI app factory and router registration
api/core/                config, logging, security, exceptions
api/routers/             endpoint modules
api/schemas/             Pydantic request and response models
api/services/            application workflow orchestration
api/dependencies/        FastAPI dependency providers
```

Endpoints should be async where possible. Routers should not contain training,
database, or deployment implementation details.

## Worker Layer

The `workers/` package contains background task execution.

```text
workers/celery_app.py    Celery app configuration
workers/tasks/           task modules for training, evaluation, deployment
```

Long-running work belongs in workers instead of API requests. Tasks should call
services, trainer registry entries, and infrastructure adapters rather than
duplicating business logic.

## Trainer Layer

The `trainers/` package contains ML training implementations.

```text
trainers/base.py         abstract trainer interface
trainers/registry.py     trainer lookup and registration
trainers/configs/        shared typed trainer configs
trainers/sklearn/        scikit-learn trainers
trainers/xgboost/        XGBoost trainers
trainers/pytorch/        PyTorch trainers
```

Trainer classes should be modular. Model configs should be supplied through
typed config objects instead of hardcoded inside trainer implementations.

## Domain Layer

The `domain/` package represents core business concepts.

```text
domain/entities/         Project, Experiment, Run, Model, Deployment
domain/repositories/     repository interfaces for persistence boundaries
```

Business rules that are independent of FastAPI, Celery, SQLAlchemy, or cloud
services should live here as the project grows.

## Infrastructure Layer

The `infrastructure/` package contains adapters for external systems.

```text
infrastructure/database/ SQLAlchemy models, sessions, migrations
infrastructure/storage/  artifact storage adapters
infrastructure/queue/    broker and queue helpers
infrastructure/tracking/ metrics and log persistence
```

Infrastructure code should be replaceable behind interfaces where practical.
For example, trainer code should not care whether artifacts are stored locally
or in S3.

## Frontend

The `frontend/` directory contains the React dashboard.

```text
frontend/src/app/        app-level routing, layout, providers
frontend/src/pages/      full page views
frontend/src/features/   feature-specific UI, hooks, types, API calls
frontend/src/components/ reusable layout and UI components
frontend/src/api/        shared API client
frontend/src/lib/        formatting and utility helpers
frontend/src/styles/     global styles
```

The UI should behave like an operations dashboard: tables, status badges,
charts, logs, config panels, and direct workflow actions.

## Initial Vertical Slice

The first implementation should focus on one complete training path before the
platform grows horizontally.

```text
tabular CSV dataset
  -> api start-run endpoint
  -> celery training task
  -> sklearn RandomForestClassifier trainer
  -> local artifact storage
  -> persisted run metrics and status
  -> frontend run detail view
```

Recommended first model:

- `RandomForestClassifier` for classification on tabular data
- typed trainer config for model parameters and dataset settings
- local filesystem storage for artifacts
- minimal persistence for run metadata, metrics, and status transitions

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
