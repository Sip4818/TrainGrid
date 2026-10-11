from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path

from backend.shared.errors import PresignedUrlNotSupportedError


class ArtifactStore(ABC):
    @abstractmethod
    def save(self, source_path: Path, artifact_path: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def load(self, artifact_path: str, destination_path: Path) -> Path:
        raise NotImplementedError

    @abstractmethod
    def generate_presigned_upload_url(
        self, key: str, content_type: str, expires_in: int
    ) -> tuple[str, datetime]:
        raise PresignedUrlNotSupportedError(
            "Presigned URLs are not supported for this ArtifactStore"
        )

    @abstractmethod
    def generate_presigned_download_url(
        self, key: str, expires_in: int
    ) -> tuple[str, datetime]:
        raise PresignedUrlNotSupportedError(
            "Presigned URLs are not supported for this ArtifactStore"
        )
