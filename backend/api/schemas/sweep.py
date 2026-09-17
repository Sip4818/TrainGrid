from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from backend.shared.enums import SearchStrategy, SweepGoal, SweepStatus


class SweepCreate(BaseModel):
    """Input schema for creating a hyperparameter sweep."""

    experiment_id: int = Field(..., description="Experiment the sweep belongs to")
    project_id: int = Field(
        ..., description="Project owning the experiment the sweep belongs to"
    )
    trainer_name: str = Field(
        ..., description="Registered trainer name, e.g. 'random_forest'"
    )
    dataset_path: str = Field(
        ..., description="Artifact-store dataset key shared by all child runs"
    )
    target_column: str = Field(..., description="Dataset column to predict")
    feature_columns: list[str] = Field(
        ..., description="Dataset columns used as features"
    )
    search_space: dict[str, list[Any]] = Field(
        ..., description="Hyperparameter name to list of candidate values"
    )
    strategy: SearchStrategy = Field(..., description="Combination strategy")
    max_combinations: int | None = Field(
        None, description="Trials to sample (required for random strategy)"
    )
    metric: str = Field("accuracy", description="Metric to optimize")
    goal: SweepGoal = Field(SweepGoal.MAXIMIZE, description="Optimization direction")

    @model_validator(mode="after")
    def check_max_combinations(self) -> "SweepCreate":
        if self.strategy == SearchStrategy.RANDOM and self.max_combinations is None:
            raise ValueError("max_combinations is required for random strategy")
        if self.strategy == SearchStrategy.GRID and self.max_combinations is not None:
            raise ValueError("max_combinations applies only to random strategy")
        if self.max_combinations is not None and self.max_combinations < 1:
            raise ValueError("max_combinations must be positive")
        return self


class SweepResponse(BaseModel):
    """Full response for a hyperparameter sweep."""

    id: int
    project_id: int
    experiment_id: int
    trainer_name: str
    dataset_path: str
    target_column: str
    feature_columns: list[str]
    search_space: dict[str, list[Any]]
    strategy: SearchStrategy
    max_combinations: int | None = None
    metric: str
    goal: SweepGoal
    status: SweepStatus
    best_run_id: int | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None
    run_ids: list[int] = Field(
        default_factory=list, description="IDs of all child runs"
    )

    class Config:
        from_attributes = True
