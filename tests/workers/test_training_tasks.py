from pathlib import Path
from typing import cast
from unittest.mock import patch

from backend.infrastructure.database.models import RunModel
from backend.infrastructure.database.session import Base, SessionLocal, engine
from backend.infrastructure.storage.local_store import LocalArtifactStore
from backend.shared.enums import RunStatus
from backend.trainers.base import BaseTrainer
from backend.workers.tasks.training_tasks import start_training_run


class FakeConfig:
    """Permissive config that accepts any trainer hyperparameters."""

    def __init__(self, **kwargs):
        self.kwargs = kwargs


class FakeTrainer(BaseTrainer):
    config_class = FakeConfig

    def __init__(self, config):
        self.config = config

    def train(self):
        return None

    def evaluate(self) -> dict[str, float]:
        return {"accuracy": 0.95}

    def save(self, output_path: str) -> None:
        Path(output_path).write_bytes(b"model-bytes")

    def predict(self, input_data):
        return {"prediction": 0, "confidence": 0.95}


def test_start_training_run_resolves_trainer_via_registry(tmp_path):
    Base.metadata.create_all(bind=engine)

    store = LocalArtifactStore(root=tmp_path)
    source = tmp_path / "uploaded.csv"
    source.write_text("f1,f2,target\n1,2,0\n")
    store.save(source, "datasets/1/dataset.csv")

    db = SessionLocal()
    run = RunModel(
        experiment_id=1,
        status=RunStatus.PENDING,
        config={
            "trainer_name": "fake",
            "dataset_path": "datasets/1/dataset.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
        },
        metrics={},
        artifact_path=None,
    )
    db.add(run)
    db.commit()
    run_id = run.id
    db.close()

    with (
        patch(
            "backend.trainers.registry.trainer_registry.get",
            return_value=FakeTrainer,
        ) as mock_get,
        patch(
            "backend.workers.tasks.training_tasks.local_artifact_store",
            store,
        ),
    ):
        result = start_training_run(str(run_id))

    assert result["status"] == "completed"
    mock_get.assert_called_once_with("fake")

    db = SessionLocal()
    updated = db.get(RunModel, run_id)
    assert updated.status == RunStatus.COMPLETED
    assert updated.metrics == {"accuracy": 0.95}
    assert updated.artifact_path == f"runs/{run_id}/model.joblib"
    db.close()
    assert (tmp_path / "runs" / str(run_id) / "model.joblib").is_file()


def _create_run(config: dict, db) -> int:
    run = RunModel(
        experiment_id=1,
        status=RunStatus.PENDING,
        config=config,
        metrics={},
        artifact_path=None,
    )
    db.add(run)
    db.commit()
    return cast(int, run.id)


class RecordingFakeTrainer(FakeTrainer):
    """FakeTrainer that records the resolved dataset_path and its content."""

    captured_paths: dict[str, str] = {}

    def __init__(self, config):
        super().__init__(config)
        RecordingFakeTrainer.captured_paths["dataset_path"] = config.kwargs[
            "dataset_path"
        ]

    def train(self):
        dataset_path = RecordingFakeTrainer.captured_paths["dataset_path"]
        assert Path(dataset_path).is_file(), (
            f"materialized dataset not readable: {dataset_path}"
        )
        RecordingFakeTrainer.captured_paths["content"] = Path(dataset_path).read_text()
        return None


def test_store_key_dataset_path_is_materialized(tmp_path):
    Base.metadata.create_all(bind=engine)

    store = LocalArtifactStore(root=tmp_path)
    source = tmp_path / "uploaded.csv"
    source.write_text("feature1,feature2,target\n1,2,0\n")
    store.save(source, "datasets/1/dataset.csv")

    db = SessionLocal()
    run_id = _create_run(
        {
            "trainer_name": "fake",
            "dataset_path": "datasets/1/dataset.csv",
            "target_column": "target",
            "feature_columns": ["feature1", "feature2"],
        },
        db,
    )
    db.close()

    RecordingFakeTrainer.captured_paths = {}

    with (
        patch(
            "backend.trainers.registry.trainer_registry.get",
            return_value=RecordingFakeTrainer,
        ),
        patch(
            "backend.workers.tasks.training_tasks.local_artifact_store",
            store,
        ),
    ):
        result = start_training_run(str(run_id))

    assert result["status"] == "completed"
    materialized = RecordingFakeTrainer.captured_paths["dataset_path"]
    assert materialized != "datasets/1/dataset.csv"
    assert RecordingFakeTrainer.captured_paths["content"] == source.read_text()
