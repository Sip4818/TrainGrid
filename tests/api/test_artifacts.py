from datetime import datetime, timezone
from unittest.mock import patch

import boto3
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

from backend.api.main import app
from backend.infrastructure.storage.local_store import LocalArtifactStore
from backend.infrastructure.storage.s3_store import S3ArtifactStore

client = TestClient(app)

STORE_PATH = "backend.api.services.artifacts_service.get_artifact_store"


@pytest.fixture
def s3_store():
    with mock_aws():
        s3_client = boto3.client("s3", region_name="us-east-1")
        yield S3ArtifactStore(
            bucket="test-bucket", region="us-east-1", client=s3_client
        )


def _expiry_delta_seconds(expires_at: str, expected: int) -> float:
    parsed = datetime.fromisoformat(expires_at)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return abs((parsed - now).total_seconds() - expected)


def test_upload_url_returns_presigned_put(s3_store):
    with patch(STORE_PATH, return_value=s3_store):
        response = client.post(
            "/artifacts/upload-url",
            json={
                "artifact_key": "datasets/1/dataset.csv",
                "content_type": "text/csv",
                "expires_in": 3600,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["artifact_key"] == "datasets/1/dataset.csv"
    assert "test-bucket" in data["upload_url"]
    assert "datasets/1/dataset.csv" in data["upload_url"]
    assert "Signature=" in data["upload_url"]
    assert _expiry_delta_seconds(data["expires_at"], 3600) < 60


def test_download_url_returns_presigned_get(s3_store):
    with patch(STORE_PATH, return_value=s3_store):
        response = client.get("/artifacts/1/download-url", params={"expires_in": 600})

    assert response.status_code == 200
    data = response.json()
    assert data["artifact_key"] == "runs/1/model.joblib"
    assert "test-bucket" in data["download_url"]
    assert "runs/1/model.joblib" in data["download_url"]
    assert "Signature=" in data["download_url"]
    assert _expiry_delta_seconds(data["expires_at"], 600) < 60


def test_expiry_bounds_enforced(s3_store):
    with patch(STORE_PATH, return_value=s3_store):
        too_short = client.post(
            "/artifacts/upload-url",
            json={
                "artifact_key": "datasets/1/dataset.csv",
                "content_type": "text/csv",
                "expires_in": 5,
            },
        )
        too_long = client.get("/artifacts/1/download-url", params={"expires_in": 99999})

    assert too_short.status_code == 422
    assert too_long.status_code == 422


def test_rejects_bad_artifact_key(s3_store):
    with patch(STORE_PATH, return_value=s3_store):
        response = client.post(
            "/artifacts/upload-url",
            json={
                "artifact_key": "evil/../x",
                "content_type": "text/csv",
                "expires_in": 3600,
            },
        )

    assert response.status_code == 422


def test_local_backend_returns_400(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    with patch(STORE_PATH, return_value=store):
        upload = client.post(
            "/artifacts/upload-url",
            json={
                "artifact_key": "datasets/1/dataset.csv",
                "content_type": "text/csv",
                "expires_in": 3600,
            },
        )
        download = client.get("/artifacts/1/download-url")

    assert upload.status_code == 400
    assert upload.json()["detail"]["code"] == "PRESIGNED_URL_NOT_SUPPORTED"
    assert download.status_code == 400
    assert download.json()["detail"]["code"] == "PRESIGNED_URL_NOT_SUPPORTED"


def test_s3_store_returns_datetime_expiry(s3_store):
    upload_url, upload_expires_at = s3_store.generate_presigned_upload_url(
        key="datasets/1/dataset.csv",
        content_type="text/csv",
        expires_in=3600,
    )
    download_url, download_expires_at = s3_store.generate_presigned_download_url(
        key="runs/1/model.joblib",
        expires_in=600,
    )

    assert isinstance(upload_url, str) and "Signature=" in upload_url
    assert isinstance(download_url, str) and "Signature=" in download_url
    now = datetime.now(timezone.utc)
    assert abs((upload_expires_at - now).total_seconds() - 3600) < 60
    assert abs((download_expires_at - now).total_seconds() - 600) < 60
