"""Seed completed training runs so the comparison flow can be exercised end-to-end.

Standalone script run inside the api container by the CI e2e-tests job
(``docker compose exec -T api python -m backend.scripts.seed_compare_runs``).

It inserts two COMPLETED runs in the default experiment with configs and
metrics shaped exactly like ``create_run`` would persist, but without
dispatching a Celery task. This keeps the comparison E2E deterministic: it
does not depend on worker timing or on a training dataset file being present.

Run locally (SQLite):
    python -m backend.scripts.seed_compare_runs
"""

from datetime import datetime, timezone

from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import ExperimentModel, RunModel
from backend.infrastructure.database.session import SessionLocal
from backend.shared.enums import RunStatus

logger = get_logger(__name__)


def _config(trainer_name: str, **overrides: object) -> dict[str, object]:
    """Build a run config matching what ``RunService.create_run`` persists."""
    base: dict[str, object] = {
        "trainer_name": trainer_name,
        "dataset_path": "datasets/1/dataset.csv",
        "target_column": "target",
        "feature_columns": ["feature1", "feature2"],
    }
    base.update(overrides)
    return base


def seed_compare_runs() -> None:
    db = SessionLocal()
    try:
        if (
            db.query(RunModel).filter(RunModel.status == RunStatus.COMPLETED).count()
            >= 2
        ):
            logger.info("Comparison runs already seeded; skipping")
            return

        experiment = db.query(ExperimentModel).first()
        if experiment is None:
            raise RuntimeError(
                "No experiment found; the default experiment should be seeded "
                "by the API on startup before this script runs"
            )

        now = datetime.now(timezone.utc)
        runs = [
            RunModel(
                experiment_id=experiment.id,
                status=RunStatus.COMPLETED,
                config=_config(
                    "random_forest",
                    n_estimators=100,
                    max_depth=10,
                ),
                metrics={"accuracy": 0.93},
                artifact_path="runs/seed/random_forest.joblib",
                started_at=now,
                finished_at=now,
            ),
            RunModel(
                experiment_id=experiment.id,
                status=RunStatus.COMPLETED,
                config=_config(
                    "xgboost",
                    n_estimators=200,
                    max_depth=6,
                    learning_rate=0.1,
                ),
                metrics={"accuracy": 0.97},
                artifact_path="runs/seed/xgboost.joblib",
                started_at=now,
                finished_at=now,
            ),
        ]
        db.add_all(runs)
        db.commit()
        for run in runs:
            db.refresh(run)
        logger.info(
            "Seeded comparison runs experiment_id=%d run_ids=%s",
            experiment.id,
            [run.id for run in runs],
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed_compare_runs()
