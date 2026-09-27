from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, ClassVar

# Event payload emitted by trainers as training progresses, e.g.
# {"type": "epoch", "epoch": 5, "total_epochs": 50, "loss": 0.12, "val_loss": 0.18}.
# Trainers stay decoupled from consumers (Redis, SSE, logging): they only know
# this shape contract, never who listens.
TrainingEvent = dict[str, Any]

# Callback trainers invoke to report progress. Optional everywhere: trainers
# whose algorithm has no iterative steps (e.g. RandomForest's atomic fit())
# simply ignore it.
TrainingCallback = Callable[[TrainingEvent], None]


class BaseTrainer(ABC):
    config_class: ClassVar[type]
    label: ClassVar[str] = ""
    model_extension: ClassVar[str] = ".joblib"

    @abstractmethod
    def train(self, on_event: TrainingCallback | None = None) -> Any:
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
