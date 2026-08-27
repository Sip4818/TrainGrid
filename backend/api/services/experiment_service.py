from datetime import datetime
from typing import cast

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.experiment import (
    Experiment,
    ExperimentCreate,
    ExperimentUpdate,
)
from backend.infrastructure.database.models import ExperimentModel, ProjectModel
from backend.shared.errors import (
    ExperimentNotFoundError,
    ExperimentNotInProjectError,
    ProjectNotFoundError,
)

logger = get_logger(__name__)


class ExperimentService:
    """
    Application service for managing experiments.

    Owns create/list/get/update/delete for experiments and validates that
    every experiment references an existing project.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_experiment(self, payload: ExperimentCreate) -> Experiment:
        logger.info(
            "Creating experiment name=%s project_id=%d",
            payload.name,
            payload.project_id,
        )
        self._validate_project(payload.project_id)
        experiment = ExperimentModel(name=payload.name, project_id=payload.project_id)
        self.db.add(experiment)
        self.db.commit()
        self.db.refresh(experiment)
        logger.info("Experiment persisted experiment_id=%d", experiment.id)
        return self._to_schema(experiment)

    def list_experiments(self, project_id: int) -> list[Experiment]:
        logger.info("Listing experiments project_id=%d", project_id)
        if self.db.get(ProjectModel, project_id) is None:
            logger.warning("Project project_id=%d not found", project_id)
            raise ProjectNotFoundError(project_id)
        experiments = (
            self.db.query(ExperimentModel)
            .filter(ExperimentModel.project_id == project_id)
            .all()
        )
        logger.info("Retrieved %d experiments", len(experiments))
        return [self._to_schema(experiment) for experiment in experiments]

    def get_experiment(self, experiment_id: int, project_id: int) -> Experiment:
        logger.info(
            "Fetching experiment experiment_id=%d project_id=%d",
            experiment_id,
            project_id,
        )
        experiment = self._validate_scope(experiment_id, project_id)
        logger.info("Experiment experiment_id=%d retrieved", experiment_id)
        return self._to_schema(experiment)

    def update_experiment(
        self, experiment_id: int, project_id: int, payload: ExperimentUpdate
    ) -> Experiment:
        logger.info(
            "Updating experiment experiment_id=%d project_id=%d",
            experiment_id,
            project_id,
        )
        experiment = self._validate_scope(experiment_id, project_id)
        if payload.project_id is not None:
            self._validate_project(payload.project_id)
            experiment.project_id = payload.project_id  # type: ignore[assignment]
        if payload.name is not None:
            experiment.name = payload.name  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(experiment)
        logger.info("Experiment experiment_id=%d updated", experiment_id)
        return self._to_schema(experiment)

    def delete_experiment(self, experiment_id: int, project_id: int) -> None:
        logger.info(
            "Deleting experiment experiment_id=%d project_id=%d",
            experiment_id,
            project_id,
        )
        experiment = self._validate_scope(experiment_id, project_id)
        self.db.delete(experiment)
        self.db.commit()
        logger.info(
            "Experiment experiment_id=%d deleted (cascaded to runs)", experiment_id
        )

    def _validate_scope(self, experiment_id: int, project_id: int) -> ExperimentModel:
        """Ensure the experiment exists and belongs to the given project."""
        experiment = self._get_or_raise(experiment_id)
        if self.db.get(ProjectModel, project_id) is None:
            logger.warning("Project project_id=%d not found", project_id)
            raise ProjectNotFoundError(project_id)
        if cast(int, experiment.project_id) != project_id:
            logger.warning(
                "Experiment experiment_id=%d does not belong to project_id=%d",
                experiment_id,
                project_id,
            )
            raise ExperimentNotInProjectError(experiment_id, project_id)
        return experiment

    def _validate_project(self, project_id: int) -> None:
        if self.db.get(ProjectModel, project_id) is None:
            logger.warning("Project project_id=%d not found", project_id)
            raise ProjectNotFoundError(project_id)

    def _get_or_raise(self, experiment_id: int) -> ExperimentModel:
        experiment = self.db.get(ExperimentModel, experiment_id)
        if experiment is None:
            logger.warning("Experiment experiment_id=%d not found", experiment_id)
            raise ExperimentNotFoundError(experiment_id)
        return experiment

    def _to_schema(self, experiment: ExperimentModel) -> Experiment:
        return Experiment(
            id=cast(int, experiment.id),
            project_id=cast(int, experiment.project_id),
            name=cast(str, experiment.name),
            created_at=cast(datetime, experiment.created_at),
            run_count=len(experiment.runs),
        )
