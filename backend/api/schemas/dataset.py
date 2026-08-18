from datetime import datetime

from pydantic import BaseModel, Field


class DatasetBase(BaseModel):
    """
    Base schema containing fields shared by both input and output.
    """

    name: str = Field(..., description="Display name of the uploaded dataset")


class DatasetCreate(DatasetBase):
    """
    Schema for the 'Input' (Request) when creating a dataset.
    The multipart upload form supplies the name and the CSV file itself.
    """


class DatasetResponse(DatasetBase):
    """
    Schema for the 'Output' (Response).
    'store_key' is the artifact-store key where the CSV lives (e.g.
    'datasets/3/dataset.csv'). It is derived from the record id so runs can
    reference an uploaded dataset purely via a store key in their config.
    """

    id: int
    size_bytes: int
    store_key: str
    created_at: datetime
