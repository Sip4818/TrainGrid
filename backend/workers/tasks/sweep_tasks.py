from datetime import datetime, timezone
from typing import Any, cast

from backend.api.core.logging import get_logger
from backend.infrastructure.database.models import RunModel, SweepModel
from backend.infrastructure.database.session import SessionLocal
from backend.shared.enums import RunStatus, SweepGoal, SweepStatus
from backend.shared.errors import SweepNotFoundError
from backend.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="sweep.aggregate_results")
def aggregate_sweep_results(header_results: list[Any], sweep_id: int) -> dict[str, Any]:
    """Chord callback: pick the best child run once all training finishes.

    Runs after every task in the sweep's group completes (success or
    failure). Only COMPLETED runs carrying the sweep's metric compete;
    anything else is ignored. Never raises for empty candidate sets —
    the sweep is marked FAILED instead.
    """
    logger.info("Aggregating sweep results sweep_id=%d", sweep_id)
    db = SessionLocal()
    try:
        sweep = db.get(SweepModel, sweep_id)
        if sweep is None:
            logger.warning("Sweep sweep_id=%d not found in database", sweep_id)
            raise SweepNotFoundError(sweep_id)

        children = db.query(RunModel).filter(RunModel.sweep_id == sweep_id).all()
        metric = cast(str, sweep.metric)
        goal = cast(SweepGoal, sweep.goal)
        candidates = [
            run
            for run in children
            if cast(RunStatus, run.status) == RunStatus.COMPLETED
            and isinstance(cast(dict, run.metrics).get(metric), (int, float))
        ]

        if not candidates:
            logger.warning(
                "Sweep sweep_id=%d has no completed runs with metric '%s'",
                sweep_id,
                metric,
            )
            sweep.status = SweepStatus.FAILED  # type: ignore[assignment]
            sweep.finished_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
            db.commit()
            return {"sweep_id": sweep_id, "status": "failed"}

        def sort_key(run: RunModel) -> tuple[float, datetime]:
            metrics = cast(dict, run.metrics)
            value = float(metrics[metric])
            finished = cast(datetime, run.finished_at) or datetime.max.replace(
                tzinfo=timezone.utc
            )
            # Negate for MAXIMIZE so index 0 is always the winner and
            # earliest finished_at always breaks ties.
            if goal == SweepGoal.MAXIMIZE:
                value = -value
            return (value, finished)

        best = sorted(candidates, key=sort_key)[0]

        sweep.best_run_id = best.id  # type: ignore[assignment]
        sweep.status = SweepStatus.COMPLETED  # type: ignore[assignment]
        sweep.finished_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
        db.commit()
        logger.info(
            "Sweep sweep_id=%d completed best_run_id=%d",
            sweep_id,
            best.id,
        )
        return {
            "sweep_id": sweep_id,
            "status": "completed",
            "best_run_id": best.id,
        }
    finally:
        db.close()
