import itertools
import random
from datetime import datetime, timezone
from typing import Any, cast

from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.sweep import SweepCreate, SweepResponse
from backend.infrastructure.database.models import (
    DatasetModel,
    ExperimentModel,
    ProjectModel,
    RunModel,
    SweepModel,
)
from backend.shared.enums import RunStatus, SearchStrategy, SweepStatus
from backend.shared.errors import (
    ExperimentNotFoundError,
    ExperimentNotInProjectError,
    InvalidSearchSpaceError,
    NotFoundError,
    ProjectNotFoundError,
    SweepNotFoundError,
)
from backend.trainers.base import BaseTrainer
from backend.trainers.registry import trainer_registry

logger = get_logger(__name__)

# Search-space keys that are shared dataset plumbing, never hyperparameters.
RESERVED_SWEEP_KEYS = frozenset(
    {"dataset_path", "target_column", "feature_columns", "trainer_name"}
)


class SweepService:
    """Application service for hyperparameter sweeps.

    Expands a search space into child training runs, dispatches them as a
    Celery chord, and exposes sweep state. Result aggregation lives in the
    chord callback (sweep_tasks).
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    def create_sweep(self, payload: SweepCreate) -> SweepResponse:
        logger.info(
            "Creating sweep for experiment_id=%d project_id=%d trainer=%s strategy=%s",
            payload.experiment_id,
            payload.project_id,
            payload.trainer_name,
            payload.strategy.value,
        )
        self._validate_scope(payload.experiment_id, payload.project_id)
        trainer_cls = trainer_registry.get(payload.trainer_name)
        self._validate_dataset(payload.dataset_path)
        combinations = self._build_combinations(payload, trainer_cls)

        base_config: dict[str, Any] = {
            "dataset_path": payload.dataset_path,
            "target_column": payload.target_column,
            "feature_columns": payload.feature_columns,
            "trainer_name": payload.trainer_name,
        }
        dataset_hash = self._resolve_dataset_hash(payload.dataset_path)

        sweep = SweepModel(
            project_id=payload.project_id,
            experiment_id=payload.experiment_id,
            trainer_name=payload.trainer_name,
            dataset_path=payload.dataset_path,
            target_column=payload.target_column,
            feature_columns=payload.feature_columns,
            search_space=payload.search_space,
            strategy=payload.strategy,
            max_combinations=payload.max_combinations,
            metric=payload.metric,
            goal=payload.goal,
            status=SweepStatus.PENDING,
        )
        self.db.add(sweep)
        self.db.commit()
        self.db.refresh(sweep)

        runs: list[RunModel] = []
        for combo in combinations:
            run = RunModel(
                experiment_id=payload.experiment_id,
                status=RunStatus.PENDING,
                config={**base_config, **combo},
                metrics={},
                artifact_path=None,
                dataset_hash=dataset_hash,
                sweep_id=cast(int, sweep.id),
            )
            self.db.add(run)
            runs.append(run)
        self.db.commit()
        for run in runs:
            self.db.refresh(run)
        logger.info(
            "Sweep persisted sweep_id=%d with %d child runs",
            sweep.id,
            len(runs),
        )

        from celery import chord, group  # type: ignore[import-untyped]

        from backend.workers.tasks.sweep_tasks import aggregate_sweep_results
        from backend.workers.tasks.training_tasks import start_training_run

        header = group(start_training_run.s(str(run.id)) for run in runs)
        try:
            chord(header)(aggregate_sweep_results.s(sweep_id=cast(int, sweep.id)))
            logger.info("Celery chord dispatched for sweep_id=%d", sweep.id)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to dispatch chord for sweep_id=%d: %s", sweep.id, exc)
            sweep.status = SweepStatus.FAILED  # type: ignore[assignment]
            self.db.commit()
            return self._to_response(sweep)

        sweep.status = SweepStatus.RUNNING  # type: ignore[assignment]
        sweep.started_at = datetime.now(tz=timezone.utc)  # type: ignore[assignment]
        self.db.commit()
        return self._to_response(sweep)

    def get_sweep(
        self, sweep_id: int, experiment_id: int, project_id: int
    ) -> SweepResponse:
        logger.info(
            "Fetching sweep sweep_id=%d experiment_id=%d project_id=%d",
            sweep_id,
            experiment_id,
            project_id,
        )
        sweep = self.db.get(SweepModel, sweep_id)
        if sweep is None:
            raise SweepNotFoundError(sweep_id)
        if cast(int, sweep.experiment_id) != experiment_id:
            logger.warning(
                "Sweep sweep_id=%d belongs to experiment_id=%d, not %d",
                sweep_id,
                sweep.experiment_id,
                experiment_id,
            )
            raise SweepNotFoundError(sweep_id)
        self._validate_scope(experiment_id, project_id)
        return self._to_response(sweep)

    def list_sweeps(self, experiment_id: int, project_id: int) -> list[SweepResponse]:
        logger.info(
            "Listing sweeps experiment_id=%d project_id=%d",
            experiment_id,
            project_id,
        )
        self._validate_scope(experiment_id, project_id)
        sweeps = (
            self.db.query(SweepModel)
            .filter(SweepModel.experiment_id == experiment_id)
            .all()
        )
        logger.info("Retrieved %d sweeps", len(sweeps))
        return [self._to_response(sweep) for sweep in sweeps]

    def _validate_scope(self, experiment_id: int, project_id: int) -> ExperimentModel:
        """Ensure the experiment exists and belongs to the given project."""
        experiment = self.db.get(ExperimentModel, experiment_id)
        if experiment is None:
            logger.warning("Experiment experiment_id=%d not found", experiment_id)
            raise ExperimentNotFoundError(experiment_id)
        if self.db.get(ProjectModel, project_id) is None:
            logger.warning("Project project_id=%d not found", project_id)
            raise ProjectNotFoundError(project_id)
        if cast(int, experiment.project_id) != project_id:
            logger.warning(
                "Experiment experiment_id=%d does not belong to project_id=%d",
                experiment_id,
                project_id,
            )
            raise ExperimentNotInProjectError(experiment_id, project_id)
        return experiment

    def _validate_dataset(self, dataset_path: str) -> DatasetModel:
        """Ensure the dataset key references a known uploaded dataset."""
        try:
            dataset_id = int(dataset_path.split("/")[1])
        except (IndexError, ValueError):
            raise NotFoundError(f"Dataset '{dataset_path}' not found")
        dataset = self.db.get(DatasetModel, dataset_id)
        if dataset is None:
            raise NotFoundError(f"Dataset '{dataset_path}' not found")
        return dataset

    def _resolve_dataset_hash(self, dataset_path: str) -> str | None:
        """Copy the dataset hash onto child runs (mirrors RunService)."""
        try:
            dataset_id = int(dataset_path.split("/")[1])
        except (IndexError, ValueError):
            return None
        dataset = self.db.get(DatasetModel, dataset_id)
        if dataset is None:
            return None
        return cast(str | None, dataset.hash)

    def _build_combinations(
        self, payload: SweepCreate, trainer_cls: type[BaseTrainer]
    ) -> list[dict[str, Any]]:
        """Expand the search space into per-run hyperparameter dicts."""
        if not payload.search_space:
            raise InvalidSearchSpaceError("search_space must not be empty")
        names = list(payload.search_space.keys())
        allowed = (
            set(trainer_cls.config_class.model_fields)  # type: ignore[attr-defined]
            - RESERVED_SWEEP_KEYS
        )
        for name in names:
            values = payload.search_space[name]
            if not isinstance(values, list) or not values:
                raise InvalidSearchSpaceError(
                    f"search_space['{name}'] must be a non-empty list"
                )
            if name not in allowed:
                raise InvalidSearchSpaceError(
                    f"search_space key '{name}' is not a hyperparameter of "
                    f"trainer '{payload.trainer_name}'"
                )

        sizes = [len(payload.search_space[name]) for name in names]
        total = 1
        for size in sizes:
            total *= size

        if payload.strategy == SearchStrategy.GRID:
            if total > SweepModel.MAX_COMBINATIONS:
                raise InvalidSearchSpaceError(
                    f"grid search would create {total} runs, exceeding the "
                    f"limit of {SweepModel.MAX_COMBINATIONS}"
                )
            return [
                dict(zip(names, values))
                for values in itertools.product(
                    *(payload.search_space[name] for name in names)
                )
            ]

        limit = cast(int, payload.max_combinations)
        if limit > SweepModel.MAX_COMBINATIONS:
            raise InvalidSearchSpaceError(
                f"max_combinations={limit} exceeds the limit of "
                f"{SweepModel.MAX_COMBINATIONS}"
            )
        count = min(limit, total)
        # Sample flat indices and decode mixed-radix: avoids materializing
        # the full cartesian product for large search spaces.
        chosen = random.sample(range(total), count)
        combinations: list[dict[str, Any]] = []
        for flat in chosen:
            combo: dict[str, Any] = {}
            rest = flat
            for name, size in zip(reversed(names), reversed(sizes)):
                rest, remainder = divmod(rest, size)
                combo[name] = payload.search_space[name][remainder]
            combinations.append(combo)
        return combinations

    def _to_response(self, sweep: SweepModel) -> SweepResponse:
        runs = self.db.query(RunModel).filter(RunModel.sweep_id == sweep.id).all()
        return SweepResponse(
            id=cast(int, sweep.id),
            project_id=cast(int, sweep.project_id),
            experiment_id=cast(int, sweep.experiment_id),
            trainer_name=cast(str, sweep.trainer_name),
            dataset_path=cast(str, sweep.dataset_path),
            target_column=cast(str, sweep.target_column),
            feature_columns=cast(list, sweep.feature_columns),
            search_space=cast(dict, sweep.search_space),
            strategy=cast(SearchStrategy, sweep.strategy),
            max_combinations=cast(int | None, sweep.max_combinations),
            metric=cast(str, sweep.metric),
            goal=cast(Any, sweep.goal),
            status=cast(SweepStatus, sweep.status),
            best_run_id=cast(int | None, sweep.best_run_id),
            created_at=cast(datetime, sweep.created_at),
            started_at=cast(datetime | None, sweep.started_at),
            finished_at=cast(datetime | None, sweep.finished_at),
            run_ids=[cast(int, run.id) for run in runs],
        )
