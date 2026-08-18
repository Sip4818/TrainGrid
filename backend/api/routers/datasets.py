from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.dataset import DatasetResponse
from backend.api.services.dataset_service import DatasetService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/", response_model=DatasetResponse)
async def create_dataset(
    file: UploadFile = File(..., description="CSV file to upload"),
    name: str | None = Form(
        None, description="Optional display name; defaults to the filename"
    ),
    db: Session = Depends(get_db),  # noqa: B008
) -> DatasetResponse:
    """Upload a CSV dataset, stored via the artifact store."""
    content = await file.read()
    dataset_name = name or file.filename or "dataset.csv"
    logger.info("Uploading dataset name=%s size=%d", dataset_name, len(content))
    return DatasetService(db).create_dataset(dataset_name, file.filename or "", content)


@router.get("/", response_model=list[DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),  # noqa: B008
) -> list[DatasetResponse]:
    """List uploaded datasets (name, size, store key, upload time)."""
    logger.info("Listing datasets")
    return DatasetService(db).list_datasets()
