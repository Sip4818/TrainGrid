from datetime import datetime

from pydantic import BaseModel, Field


class ArtifactBase(BaseModel):
    """
    Base schema containing fields shared by both input and output.
    """

    artifact_key: str = Field(
        ...,
        pattern=r"^(datasets|runs)/.+",
        description="Key for identifying the artifact",
    )


class ArtifactUrlRequest(ArtifactBase):
    """
    Schema for the 'Input' (Request) when creating a pre-signed URL.
    """

    content_type: str = Field(
        ..., description="MIME type of the artifact (e.g., 'application/octet-stream')"
    )
    expires_in: int = Field(
        3600,
        ge=60,
        le=3600,
        description="Expiration time of the pre-signed URL in seconds",
    )


class ArtifactUploadUrlResponse(ArtifactBase):
    """
    Schema for the 'Output' (Response) when creating a pre-signed upload URL.
    """

    upload_url: str = Field(
        ..., description="Pre-signed URL for uploading the artifact"
    )
    expires_at: datetime = Field(
        ..., description="Expiration time of the pre-signed URL"
    )


class ArtifactDownloadUrlResponse(ArtifactBase):
    """
    Schema for the 'Output' (Response) when creating a pre-signed download URL.
    """

    download_url: str = Field(
        ..., description="Pre-signed URL for downloading the artifact"
    )
    expires_at: datetime = Field(
        ..., description="Expiration time of the pre-signed URL"
    )
