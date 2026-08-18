from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app
from backend.infrastructure.storage.local_store import LocalArtifactStore

client = TestClient(app)

CSV_BYTES = b"feature1,feature2,target\n1,2,0\n"


def _upload_csv(store: LocalArtifactStore, filename: str, content: bytes = CSV_BYTES):
    with patch(
        "backend.api.services.dataset_service.local_artifact_store",
        store,
    ):
        return client.post(
            "/datasets/",
            files={"file": (filename, content, "text/csv")},
        )


def test_upload_csv_creates_dataset_and_stores_file(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")

    response = _upload_csv(store, "iris.csv")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "iris.csv"
    assert data["size_bytes"] == len(CSV_BYTES)
    assert data["store_key"] == f"datasets/{data['id']}/dataset.csv"
    assert (
        tmp_path / "artifacts" / "datasets" / str(data["id"]) / "dataset.csv"
    ).is_file()


def test_upload_csv_custom_name(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    with patch(
        "backend.api.services.dataset_service.local_artifact_store",
        store,
    ):
        response = client.post(
            "/datasets/",
            data={"name": "My Data"},
            files={"file": ("iris.csv", CSV_BYTES, "text/csv")},
        )

    assert response.status_code == 200
    assert response.json()["name"] == "My Data"


def test_upload_rejects_non_csv(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")

    response = _upload_csv(store, "data.txt", b"not a csv")

    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "DATASET_UPLOAD_ERROR"
    assert "csv" in data["detail"]["message"].lower()


def test_list_datasets_returns_uploaded(tmp_path):
    store = LocalArtifactStore(root=tmp_path / "artifacts")
    _upload_csv(store, "a.csv")
    _upload_csv(store, "b.csv", b"feature1,feature2,target\n3,4,1\n")

    response = client.get("/datasets/")

    assert response.status_code == 200
    data = response.json()
    names = {dataset["name"] for dataset in data}
    assert {"a.csv", "b.csv"} <= names
    for dataset in data:
        assert dataset["store_key"].startswith("datasets/")
        assert dataset["size_bytes"] > 0
