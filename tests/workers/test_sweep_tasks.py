from datetime import datetime, timezone
from typing import cast

from backend.infrastructure.database.models import RunModel, SweepModel
from backend.infrastructure.database.session import (
    Base,
    SessionLocal,
    engine,
)
from backend.shared.enums import RunStatus, SearchStrategy, SweepGoal, SweepStatus
from backend.workers.tasks.sweep_tasks import aggregate_sweep_results


def _create_sweep(
    metric: str = "accuracy",
    goal: SweepGoal = SweepGoal.MAXIMIZE,
    strategy: SearchStrategy = SearchStrategy.GRID,
) -> int:
    # Seed tests drop all tables in teardown; recreate regardless of order.
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        sweep = SweepModel(
            project_id=1,
            experiment_id=1,
            trainer_name="random_forest",
            dataset_path="datasets/1/dataset.csv",
            target_column="target",
            feature_columns=["f1", "f2"],
            search_space={"n_estimators": [100, 200]},
            strategy=strategy,
            max_combinations=None,
            metric=metric,
            goal=goal,
            status=SweepStatus.RUNNING,
        )
        db.add(sweep)
        db.commit()
        db.refresh(sweep)
        return cast(int, sweep.id)
    finally:
        db.close()


def _create_child(
    sweep_id: int,
    status: RunStatus,
    metrics: dict,
    finished_at: datetime | None = None,
) -> int:
    db = SessionLocal()
    try:
        run = RunModel(
            experiment_id=1,
            status=status,
            config={"trainer_name": "random_forest"},
            metrics=metrics,
            artifact_path=None,
            sweep_id=sweep_id,
            finished_at=finished_at,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return cast(int, run.id)
    finally:
        db.close()


def _get_sweep(sweep_id: int) -> SweepModel:
    db = SessionLocal()
    try:
        sweep = db.get(SweepModel, sweep_id)
        assert sweep is not None
        db.expunge(sweep)
        return sweep
    finally:
        db.close()


def _at(hour: int) -> datetime:
    return datetime(2026, 1, 1, hour, tzinfo=timezone.utc)


def test_aggregate_selects_best_run():
    sweep_id = _create_sweep()
    _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.90}, _at(10))
    best_id = _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.95}, _at(11))
    _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.85}, _at(12))

    result = aggregate_sweep_results([], sweep_id)

    assert result["status"] == "completed"
    assert result["best_run_id"] == best_id
    sweep = _get_sweep(sweep_id)
    assert sweep.status == SweepStatus.COMPLETED
    assert sweep.best_run_id == best_id
    assert sweep.finished_at is not None


def test_aggregate_ignores_failed_runs():
    sweep_id = _create_sweep()
    best_id = _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.90}, _at(10))
    _create_child(sweep_id, RunStatus.FAILED, {"accuracy": 0.99}, _at(11))

    result = aggregate_sweep_results([], sweep_id)

    assert result["best_run_id"] == best_id
    assert _get_sweep(sweep_id).status == SweepStatus.COMPLETED


def test_aggregate_all_failed():
    sweep_id = _create_sweep()
    _create_child(sweep_id, RunStatus.FAILED, {}, _at(10))
    _create_child(sweep_id, RunStatus.FAILED, {}, _at(11))

    result = aggregate_sweep_results([], sweep_id)

    assert result["status"] == "failed"
    sweep = _get_sweep(sweep_id)
    assert sweep.status == SweepStatus.FAILED
    assert sweep.best_run_id is None
    assert sweep.finished_at is not None


def test_aggregate_skips_runs_missing_metric():
    sweep_id = _create_sweep()
    best_id = _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.90}, _at(10))
    _create_child(sweep_id, RunStatus.COMPLETED, {"f1_score": 0.99}, _at(11))

    result = aggregate_sweep_results([], sweep_id)

    assert result["best_run_id"] == best_id


def test_aggregate_no_candidates_when_metric_absent():
    sweep_id = _create_sweep()
    _create_child(sweep_id, RunStatus.COMPLETED, {"f1_score": 0.99}, _at(10))

    result = aggregate_sweep_results([], sweep_id)

    assert result["status"] == "failed"
    assert _get_sweep(sweep_id).best_run_id is None


def test_aggregate_tie_prefers_earliest_finisher():
    sweep_id = _create_sweep()
    first_id = _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.95}, _at(10))
    _create_child(sweep_id, RunStatus.COMPLETED, {"accuracy": 0.95}, _at(12))

    result = aggregate_sweep_results([], sweep_id)

    assert result["best_run_id"] == first_id


def test_aggregate_minimize_goal():
    sweep_id = _create_sweep(metric="rmse", goal=SweepGoal.MINIMIZE)
    _create_child(sweep_id, RunStatus.COMPLETED, {"rmse": 0.50}, _at(10))
    best_id = _create_child(sweep_id, RunStatus.COMPLETED, {"rmse": 0.25}, _at(11))

    result = aggregate_sweep_results([], sweep_id)

    assert result["best_run_id"] == best_id
    assert _get_sweep(sweep_id).status == SweepStatus.COMPLETED
