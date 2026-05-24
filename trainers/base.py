from abc import ABC, abstractmethod
from typing import Any


class BaseTrainer(ABC):
    @abstractmethod
    def train(self) -> Any:
        raise NotImplementedError

    @abstractmethod
    def evaluate(self) -> dict[str, float]:
        raise NotImplementedError

    @abstractmethod
    def save(self, output_path: str) -> None:
        raise NotImplementedError
