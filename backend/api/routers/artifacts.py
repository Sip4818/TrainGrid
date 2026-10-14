from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.artifact import (
    ArtifactDownloadUrlResponse,
    ArtifactUploadUrlResponse,
    ArtifactUrlRequest,
)
from backend.api.services.artifacts_service import ArtifactsService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)


router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post("/upload-url")
def create_upload_url(
    request: ArtifactUrlRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> ArtifactUploadUrlResponse:
    """Create a pre-signed URL for uploading an artifact."""
    logger.info("Creating upload URL")
    return ArtifactsService(db).create_upload_url(request)


@router.get("/{artifact_id}/download-url")
def create_download_url(
    artifact_id: str,
    expires_in: int = Query(3600, ge=60, le=3600, description="Expiration time in seconds for the download URL"),
    db: Session = Depends(get_db),  # noqa: B008
) -> ArtifactDownloadUrlResponse:
    """Create a pre-signed URL for downloading an artifact."""
    logger.info("Creating download URL")
    return ArtifactsService(db).create_download_url(artifact_id, expires_in)
