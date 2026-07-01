class TrainGridError(Exception):
    """Base exception for all TrainGrid application errors."""


class NotFoundError(TrainGridError):
    """Raised when a requested resource does not exist."""


class TrainingRunNotFoundError(NotFoundError):
    """Raised when a training run is not found in the database."""

    def __init__(self, run_id: int) -> None:
        self.run_id = run_id
        super().__init__(f"Training run with id '{run_id}' not found")
