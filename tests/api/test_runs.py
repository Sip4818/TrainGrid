from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)


def test_create_run():
    payload = {
        "experiment_id": 1,
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
            "n_estimators": 100,
            "max_depth": 5,
        },
    }
    # Patch the Celery task so no real broker is needed
    with patch(
        "backend.workers.tasks.training_tasks.start_training_run.delay"
    ) as mock_delay:
        response = client.post("/runs/", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["experiment_id"] == 1
        # The trainer name is persisted inside the run config
        assert data["config"]["trainer_name"] == "random_forest"
        # The default status for a new run is "pending" (see RunModel default)
        assert data["status"] == "pending"
        assert "id" in data
        mock_delay.assert_called_once_with(str(data["id"]))


def test_create_run_unknown_trainer():
    payload = {
        "experiment_id": 1,
        "trainer_name": "unknown_model",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
        },
    }
    response = client.post("/runs/", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "TRAINER_NOT_FOUND"
    assert "unknown_model" in data["detail"]["message"]


def test_get_runs():
    response = client.get("/runs/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_run_not_found():
    response = client.get("/runs/999999")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"
    assert "not found" in data["detail"]["message"].lower()
