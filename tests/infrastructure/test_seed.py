import pytest

from backend.infrastructure.database.models import (
    DatasetModel,
    ExperimentModel,
    ProjectModel,
)
from backend.infrastructure.database.seed import seed_defaults
from backend.infrastructure.database.session import Base, SessionLocal, engine


@pytest.fixture(autouse=True)
def clean_database():
    """Drop and recreate all tables before each test to ensure isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_seed_creates_default_project():
    seed_defaults()

    db = SessionLocal()
    try:
        project = (
            db.query(ProjectModel)
            .filter(ProjectModel.name == "Default Project")
            .first()
        )
        assert project is not None
        assert project.id == 1
    finally:
        db.close()


def test_seed_creates_default_experiment():
    seed_defaults()

    db = SessionLocal()
    try:
        experiment = (
            db.query(ExperimentModel).filter(ExperimentModel.name == "Default").first()
        )
        assert experiment is not None
        assert experiment.id == 1
        assert experiment.project_id == 1
    finally:
        db.close()


def test_seed_creates_default_dataset(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "backend.infrastructure.database.seed.local_artifact_store",
        __import__(
            "backend.infrastructure.storage.local_store",
            fromlist=["LocalArtifactStore"],
        ).LocalArtifactStore(tmp_path / "artifacts"),
    )

    seed_defaults()

    db = SessionLocal()
    try:
        dataset = (
            db.query(DatasetModel).filter(DatasetModel.name == "sample.csv").first()
        )
        assert dataset is not None
        assert dataset.id == 1
        assert dataset.size_bytes > 0

        csv_path = tmp_path / "artifacts" / "datasets" / "1" / "dataset.csv"
        assert csv_path.exists()

        content = csv_path.read_text()
        lines = [line for line in content.split("\n") if line]
        assert len(lines) == 16
        assert lines[0] == "feature1,feature2,target"
    finally:
        db.close()


def test_seed_idempotent(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "backend.infrastructure.database.seed.local_artifact_store",
        __import__(
            "backend.infrastructure.storage.local_store",
            fromlist=["LocalArtifactStore"],
        ).LocalArtifactStore(tmp_path / "artifacts"),
    )

    seed_defaults()
    seed_defaults()

    db = SessionLocal()
    try:
        projects = db.query(ProjectModel).all()
        experiments = db.query(ExperimentModel).all()
        datasets = db.query(DatasetModel).all()
        assert len(projects) == 1
        assert len(experiments) == 1
        assert len(datasets) == 1
    finally:
        db.close()
