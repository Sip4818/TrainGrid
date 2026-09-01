from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.model import (
    ModelRegisterRequest,
    ModelStageUpdate,
    RegisteredModelResponse,
    RegisteredModelSummary,
)
from backend.api.services.model_service import ModelService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/", response_model=RegisteredModelResponse, status_code=201)
def register_model(
    payload: ModelRegisterRequest,
    db: Session = Depends(get_db),
) -> RegisteredModelResponse:
    """Register a completed training run as a new model version."""
    logger.info("Registering model name=%s version=%s", payload.name, payload.version)
    return ModelService(db).register_model(payload)


@router.get("/", response_model=list[RegisteredModelSummary])
def list_models(
    project_id: int = Query(..., description="Project ID to scope results"),
    db: Session = Depends(get_db),
) -> list[RegisteredModelSummary]:
    """List all registered models for a project (latest version per name)."""
    logger.info("Listing models for project_id=%d", project_id)
    return ModelService(db).list_models(project_id)


@router.get("/{name}", response_model=RegisteredModelResponse)
def get_model(
    name: str,
    project_id: int = Query(..., description="Project ID to scope results"),
    db: Session = Depends(get_db),
) -> RegisteredModelResponse:
    """Get the latest version of a model by name."""
    logger.info("Getting model name=%s project_id=%d", name, project_id)
    return ModelService(db).get_model(name, project_id)


@router.get("/{name}/versions", response_model=list[RegisteredModelResponse])
def list_model_versions(
    name: str,
    project_id: int = Query(..., description="Project ID to scope results"),
    db: Session = Depends(get_db),
) -> list[RegisteredModelResponse]:
    """List all versions of a model."""
    logger.info("Listing versions for model name=%s project_id=%d", name, project_id)
    return ModelService(db).list_model_versions(name, project_id)


@router.get("/{name}/versions/{version}", response_model=RegisteredModelResponse)
def get_model_version(
    name: str,
    version: str,
    project_id: int = Query(..., description="Project ID to scope results"),
    db: Session = Depends(get_db),
) -> RegisteredModelResponse:
    """Get a specific version of a model."""
    logger.info(
        "Getting model version name=%s version=%s project_id=%d",
        name,
        version,
        project_id,
    )
    return ModelService(db).get_model_version(name, version, project_id)


@router.post(
    "/{name}/versions/{version}/promote", response_model=RegisteredModelResponse
)
def promote_model(
    name: str,
    version: str,
    payload: ModelStageUpdate,
    project_id: int = Query(..., description="Project ID to scope results"),
    db: Session = Depends(get_db),
) -> RegisteredModelResponse:
    """Promote or demote a model version to a new stage."""
    logger.info(
        "Promoting model name=%s version=%s to stage=%s",
        name,
        version,
        payload.stage.value,
    )
    return ModelService(db).promote_model(name, version, payload.stage, project_id)
