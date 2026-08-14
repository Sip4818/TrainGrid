from datetime import datetime
from typing import cast

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.experiment import Experiment
from backend.api.schemas.project import Project, ProjectCreate, ProjectUpdate
from backend.infrastructure.database.models import ProjectModel
from backend.shared.errors import ProjectNotFoundError

logger = get_logger(__name__)


class ProjectService:
    """
    Application service for managing projects.

    Owns create/list/get/update/delete for projects and renders the
    'Project' response schema with nested experiments for drill-down.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_project(self, payload: ProjectCreate) -> Project:
        logger.info("Creating project name=%s", payload.name)
        project = ProjectModel(name=payload.name, description=payload.description)
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        logger.info("Project persisted project_id=%d", project.id)
        return self._to_schema(project)

    def list_projects(self) -> list[Project]:
        logger.info("Listing projects")
        projects = self.db.query(ProjectModel).all()
        logger.info("Retrieved %d projects", len(projects))
        return [self._to_schema(project) for project in projects]

    def get_project(self, project_id: int) -> Project:
        logger.info("Fetching project project_id=%d", project_id)
        project = self._get_or_raise(project_id)
        logger.info("Project project_id=%d retrieved", project_id)
        return self._to_schema(project)

    def update_project(self, project_id: int, payload: ProjectUpdate) -> Project:
        logger.info("Updating project project_id=%d", project_id)
        project = self._get_or_raise(project_id)
        if payload.name is not None:
            project.name = payload.name  # type: ignore[assignment]
        if payload.description is not None:
            project.description = payload.description  # type: ignore[assignment]
        self.db.commit()
        self.db.refresh(project)
        logger.info("Project project_id=%d updated", project_id)
        return self._to_schema(project)

    def delete_project(self, project_id: int) -> None:
        logger.info("Deleting project project_id=%d", project_id)
        project = self._get_or_raise(project_id)
        self.db.delete(project)
        self.db.commit()
        logger.info(
            "Project project_id=%d deleted (cascaded to experiments/runs)", project_id
        )

    def _get_or_raise(self, project_id: int) -> ProjectModel:
        project = self.db.get(ProjectModel, project_id)
        if project is None:
            logger.warning("Project project_id=%d not found", project_id)
            raise ProjectNotFoundError(project_id)
        return project

    def _to_schema(self, project: ProjectModel) -> Project:
        return Project(
            id=cast(int, project.id),
            name=cast(str, project.name),
            description=cast(str | None, project.description),
            created_at=cast(datetime, project.created_at),
            experiments=[
                Experiment(
                    id=cast(int, experiment.id),
                    project_id=cast(int, experiment.project_id),
                    name=cast(str, experiment.name),
                    created_at=cast(datetime, experiment.created_at),
                    run_count=len(experiment.runs),
                )
                for experiment in project.experiments
            ],
        )
