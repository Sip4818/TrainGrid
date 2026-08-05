from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import ExperimentModel
from backend.infrastructure.database.session import SessionLocal

logger = get_logger(__name__)


def seed_default_experiment() -> None:
    """Create the default experiment so run creation has a valid reference.

    Runs on API startup. Only inserts when the experiments table is empty,
    keeping the current frontend flow (default experiment_id=1) working until
    Week 5 adds user-driven experiment creation.
    """
    db = SessionLocal()
    try:
        if db.query(ExperimentModel).count() == 0:
            experiment = ExperimentModel(name="Default")
            db.add(experiment)
            db.commit()
            db.refresh(experiment)
            logger.info("Seeded default experiment experiment_id=%d", experiment.id)
    finally:
        db.close()
