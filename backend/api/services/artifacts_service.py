from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.artifact import (
    ArtifactDownloadUrlResponse,
    ArtifactUploadUrlResponse,
    ArtifactUrlRequest,
)
from backend.infrastructure.storage import get_artifact_store

logger = get_logger(__name__)


class ArtifactsService:
    """
    Application service for presigned artifact URLs.

    Mints short-lived S3 upload/download URLs; the API never handles
    file bytes. Store keys (e.g. 'datasets/3/dataset.csv') are what
    runs reference as their artifact_path.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_upload_url(
        self, request: ArtifactUrlRequest
    ) -> ArtifactUploadUrlResponse:
        artifact_store = get_artifact_store()

        upload_url, expires_at = artifact_store.generate_presigned_upload_url(
            key=request.artifact_key,
            content_type=request.content_type,
            expires_in=request.expires_in,
        )
        return ArtifactUploadUrlResponse(
            artifact_key=request.artifact_key,
            upload_url=upload_url,
            expires_at=expires_at,
        )

    def create_download_url(
        self, request: ArtifactUrlRequest
    ) -> ArtifactDownloadUrlResponse:
        artifact_store = get_artifact_store()

        download_url, expires_at = artifact_store.generate_presigned_download_url(
            key=request.artifact_key,
            expires_in=request.expires_in,
        )
        return ArtifactDownloadUrlResponse(
            artifact_key=request.artifact_key,
            download_url=download_url,
            expires_at=expires_at,
        )
