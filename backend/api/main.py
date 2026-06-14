from fastapi import FastAPI

from backend.api.routers import health, runs
from backend.infrastructure.database.session import engine, Base


def create_app() -> FastAPI:
    # 1. Initialize Database Tables
    Base.metadata.create_all(bind=engine)

    # 2. Create App
    app = FastAPI(title="TrainGrid API")

    # 3. Register Routers
    app.include_router(health.router)
    app.include_router(runs.router)

    return app


app = create_app()
