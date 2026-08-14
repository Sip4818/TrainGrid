from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.experiment import (
    Experiment,
    ExperimentCreate,
    ExperimentUpdate,
)
from backend.api.services.experiment_service import ExperimentService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.post("/", response_model=Experiment)
def create_experiment(
    payload: ExperimentCreate,
    db: Session = Depends(get_db),  # noqa: B008
) -> Experiment:
    """Create a new experiment within an existing project."""
    logger.info(
        "Creating experiment name=%s project_id=%d",
        payload.name,
        payload.project_id,
    )
    return ExperimentService(db).create_experiment(payload)


@router.get("/", response_model=list[Experiment])
def list_experiments(
    project_id: int | None = Query(
        None, description="Filter experiments by owning project"
    ),
    db: Session = Depends(get_db),  # noqa: B008
) -> list[Experiment]:
    """List experiments, optionally scoped to a project."""
    logger.info("Listing experiments project_id=%s", project_id)
    return ExperimentService(db).list_experiments(project_id=project_id)


@router.get("/{experiment_id}", response_model=Experiment)
def get_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Experiment:
    """Retrieve a single experiment."""
    logger.info("Fetching experiment experiment_id=%d", experiment_id)
    return ExperimentService(db).get_experiment(experiment_id)


@router.patch("/{experiment_id}", response_model=Experiment)
def update_experiment(
    experiment_id: int,
    payload: ExperimentUpdate,
    db: Session = Depends(get_db),  # noqa: B008
) -> Experiment:
    """Partially update an experiment."""
    logger.info("Updating experiment experiment_id=%d", experiment_id)
    return ExperimentService(db).update_experiment(experiment_id, payload)


@router.delete("/{experiment_id}")
def delete_experiment(
    experiment_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict[str, str]:
    """Delete an experiment, cascading to its runs."""
    logger.info("Deleting experiment experiment_id=%d", experiment_id)
    ExperimentService(db).delete_experiment(experiment_id)
    return {"detail": f"Experiment with id '{experiment_id}' deleted"}
