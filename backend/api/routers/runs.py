from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.run import RunComparisonResponse, RunCreate
from backend.api.services.run_service import RunService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

# router
router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/compare", response_model=RunComparisonResponse)
def compare_runs(
    experiment_id: int = Query(
        ..., description="Experiment to scope the comparison to"
    ),
    run_ids: list[int] = Query(..., description="Comma-separated run IDs to compare"),
    db: Session = Depends(get_db),  # noqa: B008
) -> RunComparisonResponse:
    """
    Compare multiple training runs side-by-side within an experiment.

    Returns each run's config and metrics plus the ordered union of metric
    keys across all compared runs.
    """
    logger.info("Comparing runs experiment_id=%d run_ids=%s", experiment_id, run_ids)
    return RunService(db).compare_runs(experiment_id, run_ids)


@router.get("/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):  # noqa: B008
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
def get_runs(
    experiment_id: int | None = Query(None, description="Filter runs by experiment"),
    db: Session = Depends(get_db),  # noqa: B008
):  # noqa: ANN201
    """
    Retrieve all training runs, optionally scoped to an experiment.
    """
    logger.info("Listing runs experiment_id=%s", experiment_id)
    service = RunService(db)
    runs = service.get_runs(experiment_id=experiment_id)
    logger.info("Retrieved %d runs", len(runs))
    return runs


@router.post("/")
def create_run(payload: RunCreate, db: Session = Depends(get_db)):  # noqa: B008
    """
    Create a new training run with the given configuration.
    """
    logger.info("Creating run for experiment_id=%d", payload.experiment_id)
    service = RunService(db)
    run = service.create_run(payload)
    logger.info("Run created successfully run_id=%d", run.id)
    return run
