from typing import cast
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app
from backend.infrastructure.database.models import ExperimentModel, RunModel
from backend.infrastructure.database.session import SessionLocal
from backend.shared.enums import RunStatus

client = TestClient(app)


def _create_completed_run(experiment_id: int) -> int:
    """Create a run via the API and mark it COMPLETED with sample metrics."""
    payload = {
        "experiment_id": experiment_id,
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
            "n_estimators": 100,
        },
    }
    with patch(
        "backend.workers.tasks.training_tasks.start_training_run.delay"
    ) as mock_delay:
        response = client.post("/runs/", json=payload)
        assert response.status_code == 200
        run_id = response.json()["id"]
        mock_delay.assert_called_once_with(str(run_id))

    db = SessionLocal()
    try:
        run = db.get(RunModel, run_id)
        assert run is not None
        run.status = RunStatus.COMPLETED  # type: ignore[assignment]
        run.metrics = {"accuracy": 0.95}  # type: ignore[assignment]
        db.commit()
    finally:
        db.close()
    return run_id


def _create_experiment(name: str) -> int:
    db = SessionLocal()
    try:
        experiment = ExperimentModel(name=name, project_id=1)
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        return cast(int, experiment.id)
    finally:
        db.close()


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


def test_get_runs_filtered_by_experiment():
    response = client.get("/runs/", params={"experiment_id": 1})
    assert response.status_code == 200
    runs = response.json()
    assert isinstance(runs, list)
    assert all(run["experiment_id"] == 1 for run in runs)


def test_get_run_not_found():
    response = client.get("/runs/999999")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"
    assert "not found" in data["detail"]["message"].lower()


def test_create_run_unknown_experiment():
    payload = {
        "experiment_id": 999999,
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
        },
    }
    response = client.post("/runs/", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"
    assert "experiment" in data["detail"]["message"].lower()


def test_compare_runs():
    run_1 = _create_completed_run(experiment_id=1)
    run_2 = _create_completed_run(experiment_id=1)

    response = client.get(
        "/runs/compare",
        params={"experiment_id": 1, "run_ids": [run_1, run_2]},
    )
    assert response.status_code == 200
    data = response.json()
    assert [run["id"] for run in data["runs"]] == [run_1, run_2]
    assert data["metrics"] == ["accuracy"]
    for run in data["runs"]:
        assert run["experiment_id"] == 1
        assert run["status"] == "completed"
        assert run["trainer_name"] == "random_forest"
        assert run["metrics"] == {"accuracy": 0.95}


def test_compare_runs_mixed_experiment():
    other_experiment_id = _create_experiment(name="Other")
    run_1 = _create_completed_run(experiment_id=1)
    run_2 = _create_completed_run(experiment_id=other_experiment_id)

    response = client.get(
        "/runs/compare",
        params={"experiment_id": 1, "run_ids": [run_1, run_2]},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "RUN_NOT_IN_EXPERIMENT"
    assert str(run_2) in data["detail"]["message"]


def test_compare_runs_not_found():
    run_id = _create_completed_run(experiment_id=1)

    response = client.get(
        "/runs/compare",
        params={"experiment_id": 1, "run_ids": [run_id, 999999]},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"


def test_compare_runs_unknown_experiment():
    run_id = _create_completed_run(experiment_id=1)

    response = client.get(
        "/runs/compare",
        params={"experiment_id": 999999, "run_ids": [run_id]},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"


def test_compare_runs_invalid_ids():
    response = client.get("/runs/compare", params={"experiment_id": 1, "run_ids": ""})
    assert response.status_code == 422

    response = client.get(
        "/runs/compare", params={"experiment_id": 1, "run_ids": "abc"}
    )
    assert response.status_code == 422

    response = client.get("/runs/compare", params={"run_ids": "1,2"})
    assert response.status_code == 422
