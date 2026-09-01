from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.model import TrainerInfo
from backend.api.services.model_service import ModelService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/trainers", tags=["trainers"])


@router.get("/", response_model=list[TrainerInfo])
def get_trainers(db: Session = Depends(get_db)) -> list[TrainerInfo]:
    """List all registered trainers with their labels and config schemas."""
    logger.info("Listing registered trainers")
    return ModelService(db).list_trainers()
