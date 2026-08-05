import pytest

from backend.shared.errors import TrainerNotFoundError
from backend.trainers.base import BaseTrainer
from backend.trainers.registry import TrainerRegistry


class FakeTrainer(BaseTrainer):
    config_class = dict

    def __init__(self, config):
        self.config = config

    def train(self):
        return None

    def evaluate(self) -> dict[str, float]:
        return {"accuracy": 0.9}

    def save(self, output_path: str) -> None:
        pass


def test_registry_starts_empty():
    registry = TrainerRegistry()

    assert registry._trainers == {}


def test_register_then_get_returns_class():
    registry = TrainerRegistry()

    registry.register("fake", FakeTrainer)

    assert registry.get("fake") is FakeTrainer


def test_get_unknown_trainer_raises_trainer_not_found():
    registry = TrainerRegistry()

    with pytest.raises(TrainerNotFoundError) as excinfo:
        registry.get("does_not_exist")

    assert "does_not_exist" in str(excinfo.value)
