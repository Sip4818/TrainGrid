from fastapi import APIRouter

from backend.api.core.logging import get_logger
from backend.api.schemas.model import TrainerInfo
from backend.api.services.model_service import ModelService

logger = get_logger(__name__)

router = APIRouter(prefix="/trainers", tags=["trainers"])


@router.get("/", response_model=list[TrainerInfo])
def get_trainers() -> list[TrainerInfo]:
    """List all registered trainers with their labels and config schemas."""
    logger.info("Listing registered trainers")
    return ModelService().list_trainers()
