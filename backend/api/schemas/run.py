from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from backend.shared.enums import RunStatus


class RunBase(BaseModel):
    """
    Base schema containing fields shared by both input and output.
    Using 'dict[str, Any]' for config allows flexibility across different ML models.
    """

    experiment_id: int
    config: dict[str, Any] = Field(
        ..., description="Hyperparameters and dataset configuration"
    )


class RunCreate(RunBase):
    """
    Schema for the 'Input' (Request).
    The user provides the experiment_id, the trainer name, and the configuration.
    """

    trainer_name: str = Field(..., description="Registered trainer name, e.g. 'random_forest'")


class Run(RunBase):
    """
    Schema for the 'Output' (Response).
    Includes fields that are managed by the database/system (id, status, timestamps).
    """

    id: int
    status: RunStatus
    metrics: dict[str, Any] = {}
    artifact_path: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None

    class Config:
        # This allows Pydantic to read data directly from SQLAlchemy models
        from_attributes = True
