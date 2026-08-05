from unittest.mock import patch

from backend.infrastructure.database.models import RunModel
from backend.infrastructure.database.session import Base, SessionLocal, engine
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
        pass


def test_start_training_run_resolves_trainer_via_registry():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    run = RunModel(
        experiment_id=1,
        status=RunStatus.PENDING,
        config={
            "trainer_name": "fake",
            "dataset_path": "dummy.csv",
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

    with patch(
        "backend.trainers.registry.trainer_registry.get",
        return_value=FakeTrainer,
    ) as mock_get:
        result = start_training_run(str(run_id))

    assert result["status"] == "completed"
    mock_get.assert_called_once_with("fake")

    db = SessionLocal()
    updated = db.get(RunModel, run_id)
    assert updated.status == RunStatus.COMPLETED
    assert updated.metrics == {"accuracy": 0.95}
    db.close()
