from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import ExperimentModel, ProjectModel
from backend.infrastructure.database.session import SessionLocal

logger = get_logger(__name__)


def seed_defaults() -> None:
    """Create the default project and experiment so run creation works.

    Runs on API startup. Only inserts when the respective tables are empty,
    keeping the current frontend flow (default experiment_id=1) working until
    the frontend drill-down lands.
    """
    db = SessionLocal()
    try:
        project: ProjectModel
        if db.query(ProjectModel).count() == 0:
            project = ProjectModel(
                name="Default Project",
                description="Default project for existing runs",
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            logger.info("Seeded default project project_id=%d", project.id)
        else:
            existing = db.query(ProjectModel).first()
            assert existing is not None
            project = existing

        if db.query(ExperimentModel).count() == 0:
            experiment = ExperimentModel(name="Default", project_id=project.id)
            db.add(experiment)
            db.commit()
            db.refresh(experiment)
            logger.info("Seeded default experiment experiment_id=%d", experiment.id)
    finally:
        db.close()
