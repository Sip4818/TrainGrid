from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.run import RunCreate
from backend.infrastructure.database.models import RunModel
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError

logger = get_logger(__name__)


class RunService:
    """
    Application service for creating and retrieving training runs.

    This service owns the workflow for the first vertical slice:
    persist the run, commit it, and enqueue the background training task.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_run(self, payload: RunCreate) -> RunModel:
        logger.info("Creating run for experiment_id=%d", payload.experiment_id)
        run = RunModel(
            experiment_id=payload.experiment_id,
            status=RunStatus.PENDING,
            config=payload.config,
            metrics={},
            artifact_path=None,
        )

        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        logger.info(
            "Run persisted run_id=%d experiment_id=%d", run.id, run.experiment_id
        )

        from backend.workers.tasks.training_tasks import start_training_run

        try:
            start_training_run.delay(str(run.id))
            logger.info("Celery task dispatched for run_id=%d", run.id)
        except Exception as exc:
            logger.error("Failed to enqueue Celery task for run_id=%d: %s", run.id, exc)
            run.status = RunStatus.FAILED  # type: ignore[assignment]
            run.metrics = {"error": f"Failed to enqueue training task: {exc}"}  # type: ignore[assignment]
            self.db.commit()

        return run

    def get_run(self, run_id: int) -> RunModel:
        logger.info("Fetching run run_id=%d", run_id)
        run = self.db.get(RunModel, run_id)
        if run is None:
            logger.warning("Run run_id=%d not found", run_id)
            raise TrainingRunNotFoundError(run_id)
        logger.info("Run run_id=%d found", run_id)
        return run

    def get_runs(self) -> list[RunModel]:
        logger.info("Listing all runs")
        runs = self.db.query(RunModel).all()
        logger.info("Retrieved %d runs", len(runs))
        return runs
