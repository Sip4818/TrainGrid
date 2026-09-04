from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.deployment import (
    DeploymentCreate,
    DeploymentResponse,
    PredictRequest,
    PredictResponse,
)
from backend.api.services.deployment_service import DeploymentService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/deployments", tags=["deployments"])


@router.post("/", response_model=DeploymentResponse, status_code=201)
def deploy_model(
    payload: DeploymentCreate,
    db: Session = Depends(get_db),  # noqa: B008
) -> DeploymentResponse:
    """Deploy a registered model into the serving pool."""
    logger.info(
        "Deploying model name=%s version=%s project_id=%d",
        payload.model_name,
        payload.model_version,
        payload.project_id,
    )
    return DeploymentService(db).deploy_model(payload)


@router.get("/", response_model=list[DeploymentResponse])
def list_deployments(
    project_id: int = Query(..., description="Project ID to scope deployments"),
    db: Session = Depends(get_db),  # noqa: B008
) -> list[DeploymentResponse]:
    """List all deployments for a project."""
    logger.info("Listing deployments for project_id=%d", project_id)
    return DeploymentService(db).list_deployments(project_id)


@router.get("/{deployment_id}", response_model=DeploymentResponse)
def get_deployment(
    deployment_id: int,
    project_id: int = Query(..., description="Project owning the deployment"),
    db: Session = Depends(get_db),  # noqa: B008
) -> DeploymentResponse:
    """Get a single deployment by ID."""
    logger.info("Getting deployment_id=%d project_id=%d", deployment_id, project_id)
    return DeploymentService(db).get_deployment(deployment_id, project_id)


@router.delete("/{deployment_id}", response_model=DeploymentResponse)
def undeploy_model(
    deployment_id: int,
    project_id: int = Query(..., description="Project owning the deployment"),
    db: Session = Depends(get_db),  # noqa: B008
) -> DeploymentResponse:
    """Stop/undeploy a model — removes it from the serving pool."""
    logger.info("Undeploying deployment_id=%d project_id=%d", deployment_id, project_id)
    return DeploymentService(db).undeploy_model(deployment_id, project_id)


@router.post("/{deployment_id}/predict", response_model=PredictResponse)
def predict(
    deployment_id: int,
    payload: PredictRequest,
    project_id: int = Query(..., description="Project owning the deployment"),
    db: Session = Depends(get_db),  # noqa: B008
) -> PredictResponse:
    """Run prediction using a specific deployment."""
    logger.info(
        "Predicting on deployment_id=%d project_id=%d", deployment_id, project_id
    )
    return DeploymentService(db).predict(deployment_id, payload.features, project_id)
