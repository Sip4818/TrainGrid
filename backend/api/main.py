from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers import health, runs
from backend.infrastructure.database.session import engine, Base
from backend.api.core.logging import configure_logging
from backend.api.core.exceptions import register_exception_handlers


def create_app() -> FastAPI:
    # 0. Activate structured logging
    configure_logging()

    # 1. Initialize Database Tables
    Base.metadata.create_all(bind=engine)

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

    return app


app = create_app()
