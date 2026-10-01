from functools import lru_cache

from backend.api.core.config import settings
from backend.api.core.logging import get_logger
from backend.infrastructure.storage.artifact_store import ArtifactStore
from backend.infrastructure.storage.local_store import LocalArtifactStore
from backend.infrastructure.storage.s3_store import S3ArtifactStore

logger = get_logger(__name__)

__all__ = [
    "ArtifactStore",
    "LocalArtifactStore",
    "S3ArtifactStore",
    "get_artifact_store",
]


def _build_s3_store() -> S3ArtifactStore:
    return S3ArtifactStore(
        bucket=settings.s3_bucket_name,
        endpoint_url=settings.s3_endpoint_url,
        region=settings.s3_region,
        access_key=settings.s3_access_key_id,
        secret_key=settings.s3_secret_access_key,
        create_bucket_on_init=settings.s3_create_bucket_on_init,
    )


@lru_cache(maxsize=1)
def get_artifact_store() -> ArtifactStore:
    """Return the configured artifact store, falling back to local on S3 failure.

    ``STORAGE_BACKEND=s3`` selects S3/MinIO; anything else selects local.
    With ``s3_strict=true`` S3 errors raise instead of falling back (prod).
    """
    if settings.storage_backend.lower() != "s3":
        return LocalArtifactStore(settings.artifact_root)
    try:
        store = _build_s3_store()
        store.healthcheck()
        return store
    except Exception as e:  # noqa: BLE001
        if settings.s3_strict:
            raise
        logger.warning("S3 init failed (%s) — falling back to LocalArtifactStore", e)
        return LocalArtifactStore(settings.artifact_root)
