from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.run import RunCreate
from backend.api.services.run_service import RunService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

# router
router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a training run by its ID.
    """
    logger.info("Fetching run run_id=%d", run_id)
    service = RunService(db)
    run = service.get_run(run_id)
    logger.info("Run run_id=%d retrieved successfully", run_id)
    return run


# get all the runs
@router.get("/")
def get_runs(db: Session = Depends(get_db)):
    """
    Retrieve all training runs.
    """
    logger.info("Listing all runs")
    service = RunService(db)
    runs = service.get_runs()
    logger.info("Retrieved %d runs", len(runs))
    return runs


@router.post("/")
def create_run(payload: RunCreate, db: Session = Depends(get_db)):
    """
    Create a new training run with the given configuration.
    """
    logger.info("Creating run for experiment_id=%d", payload.experiment_id)
    service = RunService(db)
    run = service.create_run(payload)
    logger.info("Run created successfully run_id=%d", run.id)
    return run
