import hashlib
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)


@patch("backend.api.services.dataset_service.local_artifact_store")
def test_upload_csv_computes_hash(mock_store):
    """Verify SHA-256 hash is computed and stored on dataset upload."""
    csv_content = b"col1,col2\n1,2\n3,4\n"
    expected_hash = hashlib.sha256(csv_content).hexdigest()

    response = client.post(
        "/datasets/",
        files={"file": ("test.csv", csv_content, "text/csv")},
        data={"name": "hash-test"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "id" in data

    # Verify the hash was stored by checking the DB directly
    from backend.infrastructure.database.models import DatasetModel
    from backend.infrastructure.database.session import SessionLocal

    db = SessionLocal()
    try:
        dataset = db.get(DatasetModel, data["id"])
        assert dataset is not None
        assert dataset.hash == expected_hash
    finally:
        db.close()


@patch("backend.api.services.dataset_service.local_artifact_store")
def test_hash_is_deterministic(mock_store):
    """Verify the same content always produces the same hash."""
    csv_content = b"a,b\n1,2\n"

    response1 = client.post(
        "/datasets/",
        files={"file": ("test1.csv", csv_content, "text/csv")},
        data={"name": "hash-deterministic-1"},
    )
    response2 = client.post(
        "/datasets/",
        files={"file": ("test2.csv", csv_content, "text/csv")},
        data={"name": "hash-deterministic-2"},
    )
    assert response1.status_code == 200
    assert response2.status_code == 200

    from backend.infrastructure.database.models import DatasetModel
    from backend.infrastructure.database.session import SessionLocal

    db = SessionLocal()
    try:
        d1 = db.get(DatasetModel, response1.json()["id"])
        d2 = db.get(DatasetModel, response2.json()["id"])
        assert d1.hash == d2.hash
    finally:
        db.close()
