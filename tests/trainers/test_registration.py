import pytest

from backend.shared.errors import TrainerNotFoundError
from backend.trainers.registration import register_all
from backend.trainers.registry import trainer_registry
from backend.trainers.sklearn.trainer import RandomForestClassifierTrainer


def test_register_all_discovers_random_forest():
    register_all()

    assert trainer_registry.get("random_forest") is RandomForestClassifierTrainer


def test_register_all_does_not_register_unknown_trainer():
    register_all()

    with pytest.raises(TrainerNotFoundError):
        trainer_registry.get("xgboost")
