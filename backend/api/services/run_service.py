from sqlalchemy.orm import Session

from backend.api.schemas.run import RunCreate
from backend.infrastructure.database.models import RunModel
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError


class RunService:
    """
    Application service for creating and retrieving training runs.

    This service owns the workflow for the first vertical slice:
    persist the run, commit it, and enqueue the background training task.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_run(self, payload: RunCreate) -> RunModel:
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

        from backend.workers.tasks.training_tasks import start_training_run

        try:
            start_training_run.delay(str(run.id))
        except Exception as exc:
            run.status = RunStatus.FAILED  # type: ignore[assignment]
            run.metrics = {"error": f"Failed to enqueue training task: {exc}"}  # type: ignore[assignment]
            self.db.commit()

        return run

    def get_run(self, run_id: int) -> RunModel:
        run = self.db.get(RunModel, run_id)
        if run is None:
            raise TrainingRunNotFoundError(run_id)
        return run

    def get_runs(self) -> list[RunModel]:
        return self.db.query(RunModel).all()
