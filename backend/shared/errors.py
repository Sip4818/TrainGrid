class TrainGridError(Exception):
    """Base exception for all TrainGrid application errors."""


class NotFoundError(TrainGridError):
    """Raised when a requested resource does not exist."""


class TrainingRunNotFoundError(NotFoundError):
    """Raised when a training run is not found in the database."""

    def __init__(self, run_id: int) -> None:
        self.run_id = run_id
        super().__init__(f"Training run with id '{run_id}' not found")


class TrainerNotFoundError(TrainGridError):
    """Raised when a specified trainer name is not registered."""

    def __init__(self, trainer_name: str) -> None:
        self.trainer_name = trainer_name
        super().__init__(f"Trainer '{trainer_name}' is not registered")


class ExperimentNotFoundError(NotFoundError):
    """Raised when a referenced experiment does not exist."""

    def __init__(self, experiment_id: int) -> None:
        self.experiment_id = experiment_id
        super().__init__(f"Experiment with id '{experiment_id}' not found")
