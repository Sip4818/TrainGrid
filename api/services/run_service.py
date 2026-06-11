from sqlalchemy.orm import Session

from api.schemas.run import RunCreate
from infrastructure.database.models import RunModel
from shared.enums import RunStatus


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

        from workers.tasks.training_tasks import start_training_run

        start_training_run.delay(str(run.id))
        return run

    def get_run(self, run_id: int) -> RunModel | None:
        return self.db.get(RunModel, run_id)

    def get_runs(self) -> list[RunModel]:
        return self.db.query(RunModel).all()
