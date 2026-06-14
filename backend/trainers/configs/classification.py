from backend.trainers.configs.base import TrainerConfig


class ClassificationConfig(TrainerConfig):
    target_column: str
