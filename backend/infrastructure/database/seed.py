import tempfile
from pathlib import Path

from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import (
    DatasetModel,
    ExperimentModel,
    ProjectModel,
)
from backend.infrastructure.database.session import SessionLocal
from backend.infrastructure.storage.local_store import local_artifact_store

logger = get_logger(__name__)

DATASET_STORE_KEY = "datasets/{dataset_id}/dataset.csv"

DEFAULT_DATASET_ROWS: list[str] = [
    "feature1,feature2,target",
    "1.2,3.4,0",
    "2.1,1.8,0",
    "3.5,4.2,1",
    "0.9,2.7,0",
    "4.0,5.1,1",
    "2.8,3.0,1",
    "1.5,2.2,0",
    "3.8,4.9,1",
    "0.5,1.1,0",
    "2.3,3.6,0",
    "1.7,2.9,0",
    "3.2,4.5,1",
    "0.6,1.3,0",
    "4.1,5.3,1",
    "2.5,3.2,0",
]


def seed_defaults() -> None:
    """Create the default project and experiment so run creation works.

    Runs on API startup. Only inserts when the respective tables are empty,
    keeping the current frontend flow (default experiment_id=1) working until
    the frontend drill-down lands.
    """
    db = SessionLocal()
    try:
        project: ProjectModel
        if db.query(ProjectModel).count() == 0:
            project = ProjectModel(
                name="Default Project",
                description="Default project for existing runs",
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            logger.info("Seeded default project project_id=%d", project.id)
        else:
            existing = db.query(ProjectModel).first()
            assert existing is not None
            project = existing

        if db.query(ExperimentModel).count() == 0:
            experiment = ExperimentModel(name="Default", project_id=project.id)
            db.add(experiment)
            db.commit()
            db.refresh(experiment)
            logger.info("Seeded default experiment experiment_id=%d", experiment.id)

        if db.query(DatasetModel).count() == 0:
            csv_content = "\n".join(DEFAULT_DATASET_ROWS) + "\n"
            csv_bytes = csv_content.encode("utf-8")

            dataset = DatasetModel(name="sample.csv", size_bytes=len(csv_bytes))
            db.add(dataset)
            db.commit()
            db.refresh(dataset)
            dataset_id = dataset.id
            store_key = DATASET_STORE_KEY.format(dataset_id=dataset_id)

            with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
                tmp.write(csv_bytes)
                tmp_path = Path(tmp.name)
            try:
                local_artifact_store.save(tmp_path, store_key)
            finally:
                tmp_path.unlink(missing_ok=True)

            logger.info(
                "Seeded default dataset dataset_id=%d store_key=%s",
                dataset_id,
                store_key,
            )
    finally:
        db.close()
