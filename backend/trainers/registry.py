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

    def registered_trainers(self) -> dict[str, TrainerClass]:
        """Return a copy of all registered trainers keyed by name."""
        return dict(self._trainers)


trainer_registry = TrainerRegistry()
