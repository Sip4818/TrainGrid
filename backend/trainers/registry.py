from typing import TypeAlias

from backend.shared.errors import TrainerNotFoundError
from backend.trainers.base import BaseTrainer

TrainerClass: TypeAlias = type[BaseTrainer]


class TrainerRegistry:
    def __init__(self) -> None:
        self._trainers: dict[str, TrainerClass] = {}

    def register(self, name: str, trainer_class: TrainerClass) -> None:
        self._trainers[name] = trainer_class

    def get(self, name: str) -> TrainerClass:
        try:
            return self._trainers[name]
        except KeyError:
            raise TrainerNotFoundError(name) from None


trainer_registry = TrainerRegistry()
