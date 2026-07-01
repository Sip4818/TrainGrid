import os
from datetime import datetime

from backend.workers.celery_app import celery_app
from backend.api.core.logging import get_logger
from backend.infrastructure.database.session import SessionLocal
from backend.infrastructure.database.models import RunModel
from backend.shared.enums import RunStatus
from backend.shared.errors import TrainingRunNotFoundError
from backend.trainers.sklearn.config import RandomForestClassifierConfig
from backend.trainers.sklearn.trainer import RandomForestClassifierTrainer

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
        run.started_at = datetime.utcnow()  # type: ignore[assignment]
        db.commit()
        logger.info("Training started for run_id=%s", run_id)

        config_data = run.config
        rf_config = RandomForestClassifierConfig(**config_data)

        trainer = RandomForestClassifierTrainer(config=rf_config)
        trainer.train()
        metrics = trainer.evaluate()
        logger.info("Training completed for run_id=%s metrics=%s", run_id, metrics)

        os.makedirs("artifacts", exist_ok=True)
        artifact_path = f"artifacts/model_{run_id}.joblib"
        trainer.save(artifact_path)

        run.metrics = metrics  # type: ignore[assignment]
        run.artifact_path = artifact_path  # type: ignore[assignment]
        run.status = RunStatus.COMPLETED  # type: ignore[assignment]
        run.finished_at = datetime.utcnow()  # type: ignore[assignment]
        db.commit()

        return {"run_id": run_id, "status": "completed"}

    except Exception as e:
        logger.error("Training failed for run_id=%s error=%s", run_id, e)
        run = db.query(RunModel).filter(RunModel.id == int(run_id)).first()
        if run:
            run.status = RunStatus.FAILED  # type: ignore[assignment]
            run.finished_at = datetime.utcnow()  # type: ignore[assignment]
            run.metrics = {"error": str(e)}  # type: ignore[assignment]
            db.commit()
        return {"run_id": run_id, "status": "failed", "error": str(e)}
    finally:
        db.close()
        logger.info("Database session closed for run_id=%s", run_id)
