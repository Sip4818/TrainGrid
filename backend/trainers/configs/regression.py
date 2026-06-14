from backend.trainers.configs.base import TrainerConfig


class RegressionConfig(TrainerConfig):
    target_column: str
