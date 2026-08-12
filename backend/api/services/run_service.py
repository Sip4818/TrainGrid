from typing import Any, cast

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.run import RunComparisonItem, RunComparisonResponse, RunCreate
from backend.infrastructure.database.models import ExperimentModel, RunModel
from backend.shared.enums import RunStatus
from backend.shared.errors import (
    ExperimentNotFoundError,
    RunNotInExperimentError,
    TrainingRunNotFoundError,
)
from backend.trainers.registry import trainer_registry

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
        self._validate_experiment(payload.experiment_id)
        trainer_registry.get(payload.trainer_name)
        config = {**payload.config, "trainer_name": payload.trainer_name}
        run = RunModel(
            experiment_id=payload.experiment_id,
            status=RunStatus.PENDING,
            config=config,
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
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to enqueue Celery task for run_id=%d: %s", run.id, exc)
            run.status = RunStatus.FAILED  # type: ignore[assignment]
            run.metrics = {"error": f"Failed to enqueue training task: {exc}"}  # type: ignore[assignment]
            self.db.commit()

        return run

    def _validate_experiment(self, experiment_id: int) -> None:
        if self.db.get(ExperimentModel, experiment_id) is None:
            logger.warning("Experiment experiment_id=%d not found", experiment_id)
            raise ExperimentNotFoundError(experiment_id)

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

    def compare_runs(
        self, experiment_id: int, run_ids: list[int]
    ) -> RunComparisonResponse:
        logger.info(
            "Comparing runs experiment_id=%d run_ids=%s", experiment_id, run_ids
        )
        self._validate_experiment(experiment_id)

        seen: set[int] = set()
        runs: list[RunModel] = []
        for run_id in run_ids:
            if run_id in seen:
                continue
            seen.add(run_id)
            run = self.get_run(run_id)
            if run.experiment_id != experiment_id:
                logger.warning(
                    "Run run_id=%d belongs to experiment_id=%d, not %d",
                    run_id,
                    run.experiment_id,
                    experiment_id,
                )
                raise RunNotInExperimentError(run_id, experiment_id)
            runs.append(run)

        metric_keys: list[str] = []
        for run in runs:
            for key in run.metrics.keys():
                if key not in metric_keys:
                    metric_keys.append(key)

        logger.info("Compared %d runs for experiment_id=%d", len(runs), experiment_id)
        return RunComparisonResponse(
            runs=[
                RunComparisonItem(
                    id=cast(int, run.id),
                    experiment_id=cast(int, run.experiment_id),
                    trainer_name=cast(str, run.config.get("trainer_name", "")),
                    status=cast(RunStatus, run.status),
                    config=cast(dict[str, Any], run.config),
                    metrics=cast(dict[str, Any], run.metrics),
                )
                for run in runs
            ],
            metrics=metric_keys,
        )
