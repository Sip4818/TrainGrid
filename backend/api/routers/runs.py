from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas.run import RunCreate
from backend.api.services.run_service import RunService
from backend.infrastructure.database.session import get_db

# router
router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a training run by its ID.
    """
    service = RunService(db)
    run = service.get_run(run_id)
    return run


# get all the runs
@router.get("/")
def get_runs(db: Session = Depends(get_db)):
    """
    Retrieve all training runs.
    """
    service = RunService(db)
    runs = service.get_runs()
    return runs


@router.post("/")
def create_run(payload: RunCreate, db: Session = Depends(get_db)):
    """
    Create a new training run with the given configuration.
    """
    service = RunService(db)
    run = service.create_run(payload)
    return run
