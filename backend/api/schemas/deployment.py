from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from backend.shared.enums import DeploymentStatus


class DeploymentCreate(BaseModel):
    """Input schema for deploying a registered model."""

    model_name: str = Field(
        ..., description="Registered model name (e.g. 'fraud-detector')"
    )
    model_version: str = Field(
        ..., description="Model version to deploy (e.g. 'v1.0.0')"
    )
    project_id: int = Field(..., description="Project that owns this deployment")


class DeploymentResponse(BaseModel):
    """Output schema for a deployment."""

    id: int
    model_name: str
    model_version: str
    registered_model_id: int
    project_id: int
    status: DeploymentStatus
    created_at: datetime
    started_at: datetime | None = None
    stopped_at: datetime | None = None

    class Config:
        from_attributes = True


class PredictionItem(BaseModel):
    """A single prediction result."""

    prediction: Any
    confidence: float | None = None


class PredictRequest(BaseModel):
    """Input schema for a prediction request."""

    features: dict[str, Any] | list[dict[str, Any]] = Field(
        ..., description="Feature dict (single) or list of feature dicts (batch)"
    )


class PredictResponse(BaseModel):
    """Output schema for prediction results."""

    predictions: list[PredictionItem]
    latency_ms: float
    model: str
