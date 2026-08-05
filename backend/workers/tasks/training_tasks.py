import tempfile
from datetime import datetime, timezone
from pathlib import Path

from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import RunModel
from backend.infrastructure.database.session import SessionLocal
from backend.infrastructure.storage.local_store import local_artifact_store
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError
from backend.trainers.registry import trainer_registry
from backend.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="training.start_run")
def start_training_run(run_id: str) -> dict[str, str]:
    logger.info("Training task received for run_id=%s", run_id)
    db = SessionLocal()
    try:
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if not run:
            logger.warning("Run run_id=%s not found in database", run_id)
            raise TrainingRunNotFoundError(int(run_id))

        run.status = RunStatus.RUNNING  # type: ignore[assignment]
        run.started_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
        db.commit()
        logger.info("Training started for run_id=%s", run_id)

        config_data = dict(run.config)
        trainer_name = config_data.pop("trainer_name", None)
        if not trainer_name:
            raise ValueError(f"No trainer_name configured for run_id={run_id}")

        trainer_cls = trainer_registry.get(trainer_name)
        trainer = trainer_cls(  # type: ignore[call-arg]
            config=trainer_cls.config_class(**config_data)
        )
        trainer.train()
        metrics = trainer.evaluate()
        logger.info("Training completed for run_id=%s metrics=%s", run_id, metrics)

        artifact_key = f"runs/{run_id}/model.joblib"
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_model = Path(tmp_dir) / "model.joblib"
            trainer.save(str(tmp_model))
            local_artifact_store.save(tmp_model, artifact_key)

        run.metrics = metrics  # type: ignore[assignment]
        run.artifact_path = artifact_key  # type: ignore[assignment]
        run.status = RunStatus.COMPLETED  # type: ignore[assignment]
        run.finished_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
        db.commit()

        return {"run_id": run_id, "status": "completed"}

    except Exception as e:  # noqa: BLE001
        logger.error("Training failed for run_id=%s error=%s", run_id, e)
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if run:
            run.status = RunStatus.FAILED  # type: ignore[assignment]
            run.finished_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
            run.metrics = {"error": str(e)}  # type: ignore[assignment]
            db.commit()
        return {"run_id": run_id, "status": "failed", "error": str(e)}
    finally:
        db.close()
        logger.info("Database session closed for run_id=%s", run_id)
