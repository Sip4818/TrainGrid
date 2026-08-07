from backend.api.schemas.model import TrainerInfo
from backend.trainers.registry import trainer_registry


class ModelService:
    """Read-only registry service: exposes registered trainers to the API."""

    def list_trainers(self) -> list[TrainerInfo]:
        trainers: list[TrainerInfo] = []
        for name, trainer_cls in trainer_registry.registered_trainers().items():
            trainers.append(
                TrainerInfo(
                    name=name,
                    label=trainer_cls.label or name,
                    config_schema=trainer_cls.config_class.model_json_schema(),  # type: ignore[attr-defined]
                )
            )
        return trainers
