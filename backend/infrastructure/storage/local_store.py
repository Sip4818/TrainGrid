import shutil
from datetime import datetime
from pathlib import Path

from backend.api.core.config import settings
from backend.infrastructure.storage.artifact_store import ArtifactStore
from backend.shared.errors import PresignedUrlNotSupportedError


class LocalArtifactStore(ArtifactStore):
    """Stores artifacts on the local filesystem under a configurable root."""

    def __init__(self, root: str | Path = "artifacts") -> None:
        self.root = Path(root)

    def save(self, source_path: Path, artifact_path: str) -> str:
        destination = self.root / artifact_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, destination)
        return artifact_path

    def load(self, artifact_path: str, destination_path: Path) -> Path:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self.root / artifact_path, destination_path)
        return destination_path

    def generate_presigned_upload_url(
        self, key: str, content_type: str, expires_in: int
    ) -> tuple[str, datetime]:
        raise PresignedUrlNotSupportedError(
            "Presigned URLs are not supported for LocalArtifactStore"
        )

    def generate_presigned_download_url(
        self, key: str, expires_in: int
    ) -> tuple[str, datetime]:
        raise PresignedUrlNotSupportedError(
            "Presigned URLs are not supported for LocalArtifactStore"
        )


local_artifact_store = LocalArtifactStore(settings.artifact_root)
