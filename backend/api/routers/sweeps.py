from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.sweep import SweepCreate, SweepResponse
from backend.api.services.sweep_service import SweepService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/sweeps", tags=["sweeps"])


@router.post("/", response_model=SweepResponse, status_code=201)
def create_sweep(
    payload: SweepCreate,
    db: Session = Depends(get_db),  # noqa: B008
) -> SweepResponse:
    """Create a hyperparameter sweep and dispatch its child runs."""
    logger.info(
        "Creating sweep project_id=%d experiment_id=%d trainer=%s",
        payload.project_id,
        payload.experiment_id,
        payload.trainer_name,
    )
    return SweepService(db).create_sweep(payload)


@router.get("/", response_model=list[SweepResponse])
def list_sweeps(
    project_id: int = Query(..., description="Project owning the sweeps"),
    experiment_id: int = Query(..., description="Experiment owning the sweeps"),
    db: Session = Depends(get_db),  # noqa: B008
) -> list[SweepResponse]:
    """List all sweeps for an experiment."""
    logger.info(
        "Listing sweeps project_id=%d experiment_id=%d",
        project_id,
        experiment_id,
    )
    return SweepService(db).list_sweeps(experiment_id, project_id)


@router.get("/{sweep_id}", response_model=SweepResponse)
def get_sweep(
    sweep_id: int,
    project_id: int = Query(..., description="Project owning the sweep"),
    experiment_id: int = Query(..., description="Experiment owning the sweep"),
    db: Session = Depends(get_db),  # noqa: B008
) -> SweepResponse:
    """Get a sweep by ID with its child run IDs."""
    logger.info(
        "Fetching sweep sweep_id=%d project_id=%d experiment_id=%d",
        sweep_id,
        project_id,
        experiment_id,
    )
    return SweepService(db).get_sweep(sweep_id, experiment_id, project_id)
