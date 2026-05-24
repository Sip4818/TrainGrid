from typing import TypeAlias

from trainers.base import BaseTrainer

TrainerClass: TypeAlias = type[BaseTrainer]


class TrainerRegistry:
    def __init__(self) -> None:
        self._trainers: dict[str, TrainerClass] = {}

    def register(self, name: str, trainer_class: TrainerClass) -> None:
        self._trainers[name] = trainer_class

    def get(self, name: str) -> TrainerClass:
        return self._trainers[name]


trainer_registry = TrainerRegistry()
