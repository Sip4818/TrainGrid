from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.run import Run, RunComparisonResponse, RunCreate
from backend.api.services.run_service import RunService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

# router
router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/compare", response_model=RunComparisonResponse)
def compare_runs(
    project_id: int = Query(
        ..., description="Project owning the experiment to scope the comparison to"
    ),
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
    logger.info(
        "Comparing runs project_id=%d experiment_id=%d run_ids=%s",
        project_id,
        experiment_id,
        run_ids,
    )
    return RunService(db).compare_runs(experiment_id, project_id, run_ids)


@router.get("/{run_id}", response_model=Run)
def get_run(
    run_id: int,
    project_id: int = Query(..., description="Project owning the run"),
    experiment_id: int = Query(..., description="Experiment owning the run"),
    db: Session = Depends(get_db),  # noqa: B008
):
    """
    Retrieve a training run by its ID, scoped to its experiment and project.
    """
    logger.info(
        "Fetching run run_id=%d project_id=%d experiment_id=%d",
        run_id,
        project_id,
        experiment_id,
    )
    service = RunService(db)
    run = service.get_run(run_id, experiment_id, project_id)
    logger.info("Run run_id=%d retrieved successfully", run_id)
    return run


# get all the runs
@router.get("/", response_model=list[Run])
def get_runs(
    project_id: int = Query(..., description="Project owning the runs"),
    experiment_id: int = Query(..., description="Experiment owning the runs"),
    db: Session = Depends(get_db),  # noqa: B008
):  # noqa: ANN201
    """
    Retrieve all training runs within an experiment.
    """
    logger.info(
        "Listing runs project_id=%d experiment_id=%d",
        project_id,
        experiment_id,
    )
    service = RunService(db)
    runs = service.get_runs(experiment_id=experiment_id, project_id=project_id)
    logger.info("Retrieved %d runs", len(runs))
    return runs


@router.post("/", response_model=Run)
def create_run(payload: RunCreate, db: Session = Depends(get_db)):  # noqa: B008
    """
    Create a new training run with the given configuration.
    """
    logger.info(
        "Creating run for project_id=%d experiment_id=%d",
        payload.project_id,
        payload.experiment_id,
    )
    service = RunService(db)
    run = service.create_run(payload)
    logger.info("Run created successfully run_id=%d", run.id)
    return run


@router.delete("/{run_id}")
def delete_run(
    run_id: int,
    project_id: int = Query(..., description="Project owning the run"),
    experiment_id: int = Query(..., description="Experiment owning the run"),
    db: Session = Depends(get_db),  # noqa: B008
) -> dict[str, str]:
    """
    Delete a training run by its ID, scoped to its experiment and project.
    """
    logger.info(
        "Deleting run run_id=%d project_id=%d experiment_id=%d",
        run_id,
        project_id,
        experiment_id,
    )
    return RunService(db).delete_run(run_id, experiment_id, project_id)
