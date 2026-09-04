from abc import ABC, abstractmethod
from typing import Any, ClassVar


class BaseTrainer(ABC):
    config_class: ClassVar[type]
    label: ClassVar[str] = ""

    @abstractmethod
    def train(self) -> Any:
        raise NotImplementedError

    @abstractmethod
    def evaluate(self) -> dict[str, float]:
        raise NotImplementedError

    @abstractmethod
    def save(self, output_path: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def predict(self, input_data: Any) -> Any:
        raise NotImplementedError
