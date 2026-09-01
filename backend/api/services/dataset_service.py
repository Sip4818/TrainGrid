import hashlib
import tempfile
from datetime import datetime
from pathlib import Path
from typing import cast

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.dataset import DatasetResponse
from backend.infrastructure.database.models import DatasetModel
from backend.infrastructure.storage.local_store import local_artifact_store
from backend.shared.errors import DatasetUploadError

logger = get_logger(__name__)

DATASET_STORE_KEY = "datasets/{dataset_id}/dataset.csv"


class DatasetService:
    """
    Application service for uploading and listing datasets.

    Owns the upload flow: persist the row (to obtain the id), then store the
    CSV bytes through the artifact-store abstraction at 'datasets/{id}/dataset.csv'
    so both the API and the Celery worker (which share the artifacts volume)
    can read the file. The store key is what runs reference as their dataset_path.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_dataset(
        self, name: str, original_filename: str, content: bytes
    ) -> DatasetResponse:
        logger.info("Creating dataset name=%s size=%d", name, len(content))
        self._validate_csv(original_filename)

        dataset_hash = hashlib.sha256(content).hexdigest()
        dataset = DatasetModel(name=name, size_bytes=len(content), hash=dataset_hash)
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)
        dataset_id = cast(int, dataset.id)
        store_key = DATASET_STORE_KEY.format(dataset_id=dataset_id)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)
        try:
            local_artifact_store.save(tmp_path, store_key)
        finally:
            tmp_path.unlink(missing_ok=True)

        logger.info(
            "Dataset persisted dataset_id=%d store_key=%s", dataset_id, store_key
        )
        return self._to_schema(dataset, store_key)

    def list_datasets(self) -> list[DatasetResponse]:
        logger.info("Listing datasets")
        datasets = (
            self.db.query(DatasetModel).order_by(DatasetModel.created_at.desc()).all()
        )
        logger.info("Retrieved %d datasets", len(datasets))
        return [
            self._to_schema(dataset, DATASET_STORE_KEY.format(dataset_id=dataset.id))
            for dataset in datasets
        ]

    def _validate_csv(self, name: str) -> None:
        if not name.lower().endswith(".csv"):
            logger.warning("Rejecting non-CSV dataset name=%s", name)
            raise DatasetUploadError("Only .csv files can be uploaded as datasets")

    def _to_schema(self, dataset: DatasetModel, store_key: str) -> DatasetResponse:
        return DatasetResponse(
            id=cast(int, dataset.id),
            name=cast(str, dataset.name),
            size_bytes=cast(int, dataset.size_bytes),
            store_key=store_key,
            created_at=cast(datetime, dataset.created_at),
        )
