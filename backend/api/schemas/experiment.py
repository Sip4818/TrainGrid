from datetime import datetime

from pydantic import BaseModel, Field


class ExperimentBase(BaseModel):
    """
    Base schema containing fields shared by both input and output.
    """

    name: str = Field(..., description="Experiment name")
    project_id: int = Field(..., description="Id of the owning project")


class ExperimentCreate(ExperimentBase):
    """
    Schema for the 'Input' (Request) when creating an experiment.
    """


class ExperimentUpdate(BaseModel):
    """
    Schema for partial updates (PATCH). All fields optional so callers can
    update a single field without resending the whole object.
    """

    name: str | None = Field(None, description="Experiment name")
    project_id: int | None = Field(None, description="Id of the owning project")


class Experiment(ExperimentBase):
    """
    Schema for the 'Output' (Response).
    'run_count' is the number of training runs owned by this experiment.
    """

    id: int
    created_at: datetime
    run_count: int = 0
