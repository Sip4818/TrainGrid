from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from backend.shared.enums import ModelStage


class TrainerInfo(BaseModel):
    """Descriptor of a registered trainer exposed to clients."""

    name: str
    label: str
    config_schema: dict[str, Any]


# --- Model Registry schemas ---


class ModelRegisterRequest(BaseModel):
    """Input schema for registering a completed run as a model version."""

    name: str = Field(..., description="Model name (e.g. 'fraud-detector')")
    version: str = Field(..., description="Semver version (e.g. 'v1.0.0')")
    run_id: int = Field(..., description="ID of the completed training run")
    project_id: int = Field(..., description="Project that owns this model")
    experiment_id: int = Field(..., description="Experiment that produced the run")
    description: str | None = Field(None, description="Optional description")


class ModelStageUpdate(BaseModel):
    """Input schema for promoting/demoting a model version."""

    stage: ModelStage


class RegisteredModelResponse(BaseModel):
    """Full response for a registered model version."""

    id: int
    name: str
    version: str
    run_id: int
    project_id: int
    experiment_id: int
    stage: ModelStage
    description: str | None = None
    artifact_path: str
    artifact_checksum: str | None = None
    dataset_hash: str | None = None
    config: dict[str, Any] = {}
    metrics: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RegisteredModelSummary(BaseModel):
    """Lightweight response for list views."""

    id: int
    name: str
    version: str
    stage: ModelStage
    metrics: dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True
