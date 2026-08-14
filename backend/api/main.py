from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.core.exceptions import register_exception_handlers
from backend.api.core.logging import configure_logging
from backend.api.routers import experiments, health, models, projects, runs
from backend.infrastructure.database.seed import seed_defaults
from backend.infrastructure.database.session import Base, engine
from backend.trainers.registration import register_all


def create_app() -> FastAPI:
    # 0. Activate structured logging
    configure_logging()

    # 1. Initialize Database Tables
    Base.metadata.create_all(bind=engine)

    # 1.1 Seed a default project + experiment so run creation has a valid reference
    seed_defaults()

    # 2. Register available trainers so they can be resolved by name
    register_all()

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

    # 3. Register Exception Handlers
    register_exception_handlers(app)

    # 4. Register Routers
    app.include_router(health.router)
    app.include_router(runs.router)
    app.include_router(models.router)
    app.include_router(projects.router)
    app.include_router(experiments.router)

    return app


app = create_app()
