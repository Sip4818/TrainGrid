import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import RunModel
from backend.infrastructure.database.session import SessionLocal
from backend.infrastructure.storage.local_store import local_artifact_store
from backend.infrastructure.tracking.metrics_store import (
    traingrid_active_runs,
    traingrid_runs_status_transitions_total,
    traingrid_training_duration_seconds,
)
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError
from backend.trainers.registry import trainer_registry
from backend.workers.celery_app import celery_app

logger = get_logger(__name__)


def _status_label(status: Any) -> str:
    """Return the plain string value for a status (enum member or raw str).

    Typed as ``Any`` because SQLAlchemy model attributes are untyped
    (``Column[Any]``); at runtime the value is always a ``RunStatus`` or str.
    """
    if isinstance(status, RunStatus):
        return status.value
    return str(status)


def _transition_to(db: Session, run: RunModel, to_status: RunStatus) -> None:
    """Persist a status change and record it in Prometheus as one unit."""
    from_status = _status_label(run.status)
    run.status = to_status  # type: ignore[assignment]
    db.commit()
    traingrid_runs_status_transitions_total.labels(
        from_status, _status_label(to_status)
    ).inc()


def resolve_dataset_path(dataset_path: str, tmp_dir: Path) -> str:
    """Resolve a run's dataset_path into a filesystem path for the trainer.

    dataset_path must be an artifact-store key referencing an uploaded
    dataset (e.g. 'datasets/3/dataset.csv'). Store keys are materialized
    into tmp_dir for the trainer to read.
    """
    return str(local_artifact_store.load(dataset_path, tmp_dir / "dataset.csv"))


@celery_app.task(name="training.start_run")
def start_training_run(run_id: str) -> dict[str, str]:
    logger.info("Training task received for run_id=%s", run_id)
    db = SessionLocal()
    training_begun = False
    training_started = 0.0
    trainer_name: str | None = None
    try:
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if not run:
            logger.warning("Run run_id=%s not found in database", run_id)
            raise TrainingRunNotFoundError(int(run_id))

        _transition_to(db, run, RunStatus.RUNNING)
        run.started_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
        db.commit()
        training_begun = True
        training_started = time.perf_counter()
        traingrid_active_runs.inc()
        logger.info("Training started for run_id=%s", run_id)

        config_data = dict(run.config)
        trainer_name = config_data.pop("trainer_name", None)
        if not trainer_name:
            raise ValueError(f"No trainer_name configured for run_id={run_id}")

        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_root = Path(tmp_dir)
            dataset_path = config_data.get("dataset_path")
            if dataset_path:
                config_data["dataset_path"] = resolve_dataset_path(
                    dataset_path, tmp_root
                )

            trainer_cls = trainer_registry.get(trainer_name)
            trainer = trainer_cls(  # type: ignore[call-arg]
                config=trainer_cls.config_class(**config_data)
            )
            trainer.train()
            metrics = trainer.evaluate()
            logger.info("Training completed for run_id=%s metrics=%s", run_id, metrics)

            artifact_key = f"runs/{run_id}/model{trainer_cls.model_extension}"
            tmp_model = tmp_root / f"model{trainer_cls.model_extension}"
            trainer.save(str(tmp_model))
            local_artifact_store.save(tmp_model, artifact_key)

        run.metrics = metrics  # type: ignore[assignment]
        run.artifact_path = artifact_key  # type: ignore[assignment]
        run.finished_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
        _transition_to(db, run, RunStatus.COMPLETED)
        traingrid_active_runs.dec()
        traingrid_training_duration_seconds.labels(
            trainer_name or "unknown", _status_label(RunStatus.COMPLETED)
        ).observe(time.perf_counter() - training_started)

        return {"run_id": run_id, "status": "completed"}

    except Exception as e:  # noqa: BLE001
        logger.error("Training failed for run_id=%s error=%s", run_id, e)
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if run:
            run.finished_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
            run.metrics = {"error": str(e)}  # type: ignore[assignment]
            if training_begun:
                _transition_to(db, run, RunStatus.FAILED)
                traingrid_active_runs.dec()
                traingrid_training_duration_seconds.labels(
                    trainer_name or "unknown", _status_label(RunStatus.FAILED)
                ).observe(time.perf_counter() - training_started)
            else:
                run.status = RunStatus.FAILED  # type: ignore[assignment]
                db.commit()
        return {"run_id": run_id, "status": "failed", "error": str(e)}
    finally:
        db.close()
        logger.info("Database session closed for run_id=%s", run_id)
