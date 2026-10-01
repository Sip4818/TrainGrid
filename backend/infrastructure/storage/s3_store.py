from pathlib import Path
from typing import Any

import boto3
from botocore.client import BaseClient
from botocore.exceptions import ClientError

from backend.api.core.logging import get_logger
from backend.infrastructure.storage.artifact_store import ArtifactStore

logger = get_logger(__name__)


class S3ArtifactStore(ArtifactStore):
    """Stores artifacts in S3 (or S3-compatible MinIO) under a bucket.

    Uses sync ``boto3`` because all call-sites (FastAPI services, Celery
    tasks, seed script) are synchronous. ``upload_file``/``download_file``
    already perform threaded multipart transfers internally.
    """

    def __init__(
        self,
        bucket: str,
        endpoint_url: str | None = None,
        region: str = "us-east-1",
        access_key: str | None = None,
        secret_key: str | None = None,
        create_bucket_on_init: bool = True,
        client: BaseClient | None = None,
    ) -> None:
        self.bucket = bucket
        if client is not None:
            self.client = client
        else:
            kwargs: dict[str, Any] = {"region_name": region}
            if endpoint_url:
                kwargs["endpoint_url"] = endpoint_url
            if access_key:
                kwargs["aws_access_key_id"] = access_key
            if secret_key:
                kwargs["aws_secret_access_key"] = secret_key
            self.client = boto3.client("s3", **kwargs)
        if create_bucket_on_init:
            self._ensure_bucket(region)

    def _ensure_bucket(self, region: str) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchBucket", "NotFound"):
                create_kwargs: dict[str, Any] = {"Bucket": self.bucket}
                if region != "us-east-1":
                    create_kwargs["CreateBucketConfiguration"] = {
                        "LocationConstraint": region
                    }
                try:
                    self.client.create_bucket(**create_kwargs)
                except ClientError as create_error:
                    create_code = create_error.response.get("Error", {}).get("Code", "")
                    if create_code not in (
                        "BucketAlreadyExists",
                        "BucketAlreadyOwnedByYou",
                    ):
                        raise
                logger.info("Created S3 bucket bucket=%s", self.bucket)
            elif code in ("BucketAlreadyExists", "BucketAlreadyOwnedByYou"):
                pass
            else:
                raise

    def healthcheck(self) -> None:
        self.client.head_bucket(Bucket=self.bucket)

    def save(self, source_path: Path, artifact_path: str) -> str:
        self.client.upload_file(str(source_path), self.bucket, artifact_path)
        return artifact_path

    def load(self, artifact_path: str, destination_path: Path) -> Path:
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        self.client.download_file(self.bucket, artifact_path, str(destination_path))
        return destination_path
