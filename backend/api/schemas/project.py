from datetime import datetime

from pydantic import BaseModel, Field

from backend.api.schemas.experiment import Experiment


class ProjectBase(BaseModel):
    """
    Base schema containing fields shared by both input and output.
    """

    name: str = Field(..., description="Project name")
    description: str | None = Field(None, description="Optional project description")


class ProjectCreate(ProjectBase):
    """
    Schema for the 'Input' (Request) when creating a project.
    """


class ProjectUpdate(BaseModel):
    """
    Schema for partial updates (PATCH). All fields optional so callers can
    update a single field without resending the whole object.
    """

    name: str | None = Field(None, description="Project name")
    description: str | None = Field(None, description="Optional project description")


class Project(ProjectBase):
    """
    Schema for the 'Output' (Response).
    Includes the owning project's experiments for drill-down navigation.
    """

    id: int
    created_at: datetime
    experiments: list[Experiment] = []
