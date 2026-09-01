import hashlib
from datetime import datetime
from pathlib import Path
from typing import cast

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.model import (
    ModelRegisterRequest,
    RegisteredModelResponse,
    RegisteredModelSummary,
    TrainerInfo,
)
from backend.infrastructure.database.models import (
    ExperimentModel,
    ProjectModel,
    RegisteredModel,
    RunModel,
)
from backend.infrastructure.storage.local_store import local_artifact_store
from backend.shared.enums import ModelStage, RunStatus
from backend.shared.errors import (
    ExperimentNotFoundError,
    ModelNotFoundError,
    ModelVersionExistsError,
    ModelVersionNotFoundError,
    ProjectNotFoundError,
    RunNotInScopeError,
    TrainingRunNotFoundError,
)
from backend.trainers.registry import trainer_registry

logger = get_logger(__name__)

# Allowed stage transitions
STAGE_TRANSITIONS: dict[ModelStage, list[ModelStage]] = {
    ModelStage.NONE: [ModelStage.STAGING, ModelStage.ARCHIVED],
    ModelStage.STAGING: [ModelStage.PRODUCTION, ModelStage.NONE, ModelStage.ARCHIVED],
    ModelStage.PRODUCTION: [ModelStage.STAGING, ModelStage.ARCHIVED],
    ModelStage.ARCHIVED: [ModelStage.NONE],
}


class ModelService:
    """Registry service: exposes registered trainers and manages the model registry."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # --- Trainer registry (read-only) ---

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

    # --- Model registry CRUD ---

    def register_model(self, payload: ModelRegisterRequest) -> RegisteredModelResponse:
        """Register a completed run as a new model version."""
        logger.info(
            "Registering model name=%s version=%s run_id=%d",
            payload.name,
            payload.version,
            payload.run_id,
        )

        # Validate run exists
        run = self.db.get(RunModel, payload.run_id)
        if run is None:
            raise TrainingRunNotFoundError(payload.run_id)

        # Validate run belongs to the specified project/experiment
        if cast(int, run.experiment_id) != payload.experiment_id:
            raise RunNotInScopeError(
                payload.run_id, payload.project_id, payload.experiment_id
            )
        if cast(int, run.experiment.project_id) != payload.project_id:
            raise RunNotInScopeError(
                payload.run_id, payload.project_id, payload.experiment_id
            )

        # Validate run is completed
        if run.status != RunStatus.COMPLETED:
            raise RunNotInScopeError(
                payload.run_id, payload.project_id, payload.experiment_id
            )

        # Validate experiment and project exist
        if self.db.get(ExperimentModel, payload.experiment_id) is None:
            raise ExperimentNotFoundError(payload.experiment_id)
        if self.db.get(ProjectModel, payload.project_id) is None:
            raise ProjectNotFoundError(payload.project_id)

        # Check for duplicate name+version
        existing = (
            self.db.query(RegisteredModel)
            .filter(
                RegisteredModel.name == payload.name,
                RegisteredModel.version == payload.version,
            )
            .first()
        )
        if existing is not None:
            raise ModelVersionExistsError(payload.name, payload.version)

        # Compute artifact checksum
        artifact_checksum = self._compute_artifact_checksum(
            cast(str | None, run.artifact_path)
        )

        # Create the registered model
        registered = RegisteredModel(
            name=payload.name,
            version=payload.version,
            run_id=payload.run_id,
            project_id=payload.project_id,
            experiment_id=payload.experiment_id,
            stage=ModelStage.NONE,
            description=payload.description,
            artifact_path=cast(str, run.artifact_path),
            artifact_checksum=artifact_checksum,
            dataset_hash=run.dataset_hash,
            config=cast(dict, run.config),
            metrics=cast(dict, run.metrics),
        )
        self.db.add(registered)
        self.db.commit()
        self.db.refresh(registered)

        logger.info(
            "Model registered model_id=%d name=%s version=%s",
            registered.id,
            payload.name,
            payload.version,
        )
        return RegisteredModelResponse.model_validate(registered)

    def list_models(self, project_id: int) -> list[RegisteredModelSummary]:
        """List all registered models for a project (latest version per name)."""
        logger.info("Listing models for project_id=%d", project_id)
        # Get the latest version per model name
        subq = (
            self.db.query(
                RegisteredModel.name,
                RegisteredModel.project_id,
                RegisteredModel.id,
            )
            .filter(RegisteredModel.project_id == project_id)
            .order_by(RegisteredModel.name, RegisteredModel.id.desc())
            .subquery()
        )
        latest_ids = self.db.query(subq.c.id).group_by(subq.c.name).all()
        id_list = [row[0] for row in latest_ids]
        if not id_list:
            return []

        models = (
            self.db.query(RegisteredModel)
            .filter(RegisteredModel.id.in_(id_list))
            .order_by(RegisteredModel.name)
            .all()
        )
        return [
            RegisteredModelSummary(
                id=cast(int, m.id),
                name=cast(str, m.name),
                version=cast(str, m.version),
                stage=cast(ModelStage, m.stage),
                metrics=cast(dict, m.metrics),
                created_at=cast(datetime, m.created_at),
            )
            for m in models
        ]

    def get_model(self, name: str, project_id: int) -> RegisteredModelResponse:
        """Get the latest version of a model by name."""
        logger.info("Getting model name=%s project_id=%d", name, project_id)
        model = (
            self.db.query(RegisteredModel)
            .filter(
                RegisteredModel.name == name, RegisteredModel.project_id == project_id
            )
            .order_by(RegisteredModel.id.desc())
            .first()
        )
        if model is None:
            raise ModelNotFoundError(name)
        return RegisteredModelResponse.model_validate(model)

    def list_model_versions(
        self, name: str, project_id: int
    ) -> list[RegisteredModelResponse]:
        """List all versions of a model."""
        logger.info(
            "Listing versions for model name=%s project_id=%d", name, project_id
        )
        models = (
            self.db.query(RegisteredModel)
            .filter(
                RegisteredModel.name == name, RegisteredModel.project_id == project_id
            )
            .order_by(RegisteredModel.id.desc())
            .all()
        )
        if not models:
            raise ModelNotFoundError(name)
        return [RegisteredModelResponse.model_validate(m) for m in models]

    def get_model_version(
        self, name: str, version: str, project_id: int
    ) -> RegisteredModelResponse:
        """Get a specific version of a model."""
        logger.info(
            "Getting model version name=%s version=%s project_id=%d",
            name,
            version,
            project_id,
        )
        model = (
            self.db.query(RegisteredModel)
            .filter(
                RegisteredModel.name == name,
                RegisteredModel.version == version,
                RegisteredModel.project_id == project_id,
            )
            .first()
        )
        if model is None:
            raise ModelVersionNotFoundError(name, version)
        return RegisteredModelResponse.model_validate(model)

    def promote_model(
        self, name: str, version: str, stage: ModelStage, project_id: int
    ) -> RegisteredModelResponse:
        """Promote or demote a model version to a new stage."""
        logger.info(
            "Promoting model name=%s version=%s to stage=%s project_id=%d",
            name,
            version,
            stage.value,
            project_id,
        )
        model = (
            self.db.query(RegisteredModel)
            .filter(
                RegisteredModel.name == name,
                RegisteredModel.version == version,
                RegisteredModel.project_id == project_id,
            )
            .first()
        )
        if model is None:
            raise ModelVersionNotFoundError(name, version)

        current_stage = cast(ModelStage, model.stage)
        allowed = STAGE_TRANSITIONS.get(current_stage, [])
        if stage not in allowed:
            raise RunNotInScopeError(
                cast(int, model.id), project_id, cast(int, model.experiment_id)
            )

        model.stage = stage  # type: ignore[assignment]
        model.updated_at = datetime.utcnow()  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(model)

        logger.info(
            "Model promoted name=%s version=%s %s→%s",
            name,
            version,
            current_stage.value,
            stage.value,
        )
        return RegisteredModelResponse.model_validate(model)

    # --- Private helpers ---

    def _compute_artifact_checksum(self, artifact_path: str | None) -> str | None:
        """Compute SHA-256 of the .joblib artifact file."""
        if not artifact_path:
            return None
        try:
            tmp_dir = Path("/tmp")
            loaded_path = local_artifact_store.load(artifact_path, tmp_dir / "checksum")
            with open(loaded_path, "rb") as f:
                content = f.read()
            return hashlib.sha256(content).hexdigest()
        except Exception:
            logger.warning("Failed to compute checksum for %s", artifact_path)
            return None
