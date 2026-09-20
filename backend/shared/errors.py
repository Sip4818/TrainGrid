from backend.shared.enums import ModelStage


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


class ProjectNotFoundError(NotFoundError):
    """Raised when a referenced project does not exist."""

    def __init__(self, project_id: int) -> None:
        self.project_id = project_id
        super().__init__(f"Project with id '{project_id}' not found")


class ExperimentNotInProjectError(NotFoundError):
    """Raised when an experiment does not belong to the requested project."""

    def __init__(self, experiment_id: int, project_id: int) -> None:
        self.experiment_id = experiment_id
        self.project_id = project_id
        super().__init__(
            f"Experiment with id '{experiment_id}' does not belong to "
            f"project '{project_id}'"
        )


class RunNotInExperimentError(TrainGridError):
    """Raised when a run does not belong to the experiment being compared."""

    def __init__(self, run_id: int, experiment_id: int) -> None:
        self.run_id = run_id
        self.experiment_id = experiment_id
        super().__init__(
            f"Run with id '{run_id}' does not belong to experiment '{experiment_id}'"
        )


class DatasetUploadError(TrainGridError):
    """Raised when an uploaded file is not a valid CSV dataset."""


class ModelNotFoundError(NotFoundError):
    """Raised when a registered model name does not exist."""

    def __init__(self, name: str) -> None:
        self.name = name
        super().__init__(f"Registered model '{name}' not found")


class ModelVersionNotFoundError(NotFoundError):
    """Raised when a specific model version does not exist."""

    def __init__(self, name: str, version: str) -> None:
        self.name = name
        self.version = version
        super().__init__(f"Model '{name}' version '{version}' not found")


class ModelVersionExistsError(TrainGridError):
    """Raised when attempting to register a duplicate model name+version."""

    def __init__(self, name: str, version: str) -> None:
        self.name = name
        self.version = version
        super().__init__(f"Model '{name}' version '{version}' already exists")


class RunNotInScopeError(TrainGridError):
    """Raised when a run does not belong to the specified project/experiment."""

    def __init__(self, run_id: int, project_id: int, experiment_id: int) -> None:
        self.run_id = run_id
        self.project_id = project_id
        self.experiment_id = experiment_id
        super().__init__(
            f"Run '{run_id}' does not belong to project '{project_id}', "
            f"experiment '{experiment_id}'"
        )


class InvalidStageTransitionError(TrainGridError):
    """Raised when a model version moves to a forbidden stage."""

    def __init__(
        self,
        name: str,
        version: str,
        current_stage: ModelStage,
        allowed_stages: list[ModelStage],
    ) -> None:
        self.name = name
        self.version = version
        self.current_stage = current_stage
        self.allowed_stages = allowed_stages
        allowed = ", ".join(s.value for s in allowed_stages) or "none"
        super().__init__(
            f"Cannot move model '{name}' version '{version}' "
            f"from stage '{current_stage.value}' to the requested stage. "
            f"Allowed targets: {allowed}"
        )


class DeploymentNotFoundError(NotFoundError):
    """Raised when a deployment ID doesn't exist."""

    def __init__(self, deployment_id: int) -> None:
        self.deployment_id = deployment_id
        super().__init__(f"Deployment with id '{deployment_id}' not found")


class SweepNotFoundError(NotFoundError):
    """Raised when a hyperparameter sweep ID does not exist."""

    def __init__(self, sweep_id: int) -> None:
        self.sweep_id = sweep_id
        super().__init__(f"Sweep with id '{sweep_id}' not found")


class InvalidSearchSpaceError(TrainGridError):
    """Raised when a sweep search space is malformed or exceeds limits."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class ModelNotDeployableError(NotFoundError):
    """Raised when trying to deploy a model that doesn't exist in the registry."""

    def __init__(self, name: str, version: str) -> None:
        self.name = name
        self.version = version
        super().__init__(f"Model '{name}' version '{version}' not found in registry")


class DeploymentAlreadyExistsError(TrainGridError):
    """Raised when a model version is already deployed."""

    def __init__(self, name: str, version: str) -> None:
        self.name = name
        self.version = version
        super().__init__(f"Model '{name}' version '{version}' is already deployed")


class PredictionError(TrainGridError):
    """Raised when prediction fails (bad features, load error, etc.)."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class CannotRegisterModelTrainerError(TrainGridError):
    """Raised when a model trainer cannot be registered."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
