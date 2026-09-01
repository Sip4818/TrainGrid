from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app
from backend.infrastructure.database.models import (
    ExperimentModel,
    RunModel,
)
from backend.infrastructure.database.session import SessionLocal
from backend.shared.enums import RunStatus

client = TestClient(app)


def _create_experiment(name: str = "test-experiment") -> int:
    db = SessionLocal()
    try:
        experiment = ExperimentModel(project_id=1, name=name)
        db.add(experiment)
        db.commit()
        db.refresh(experiment)
        return int(experiment.id)
    finally:
        db.close()


def _create_completed_run(experiment_id: int, project_id: int = 1) -> int:
    db = SessionLocal()
    try:
        run = RunModel(
            experiment_id=experiment_id,
            status=RunStatus.PENDING,
            config={"trainer_name": "random_forest", "n_estimators": 10},
            metrics={},
            artifact_path=None,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        run_id = int(run.id)
        # Simulate completed training
        run.status = RunStatus.COMPLETED  # type: ignore[assignment]
        run.metrics = {"accuracy": 0.95}  # type: ignore[assignment]
        run.artifact_path = f"runs/{run_id}/model.joblib"  # type: ignore[assignment]
        db.commit()
        return run_id
    finally:
        db.close()


def _create_run_with_status(experiment_id: int, status: RunStatus) -> int:
    db = SessionLocal()
    try:
        run = RunModel(
            experiment_id=experiment_id,
            status=status,
            config={"trainer_name": "random_forest"},
            metrics={},
            artifact_path=None,
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return int(run.id)
    finally:
        db.close()


# --- Registration tests ---


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_register_model(mock_delay):
    run_id = _create_completed_run(1)
    response = client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
            "description": "First version",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "fraud-detector"
    assert data["version"] == "v1.0.0"
    assert data["stage"] == "none"
    assert data["run_id"] == run_id
    assert data["project_id"] == 1
    assert data["experiment_id"] == 1
    assert data["description"] == "First version"
    assert data["config"]["trainer_name"] == "random_forest"
    assert data["metrics"]["accuracy"] == 0.95


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_register_model_duplicate_version(mock_delay):
    run_id = _create_completed_run(1)
    # Register first time
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    # Register same name+version again
    run_id2 = _create_completed_run(1)
    response = client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id2,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    assert response.status_code == 409
    data = response.json()
    assert data["detail"]["code"] == "MODEL_VERSION_EXISTS"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_register_model_run_not_completed(mock_delay):
    run_id = _create_run_with_status(1, RunStatus.RUNNING)
    response = client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "RUN_NOT_IN_SCOPE"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_register_model_run_wrong_project(mock_delay):
    run_id = _create_completed_run(1)
    response = client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 999,
            "experiment_id": 1,
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "RUN_NOT_IN_SCOPE"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_register_model_run_wrong_experiment(mock_delay):
    run_id = _create_completed_run(1)
    response = client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 999,
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "RUN_NOT_IN_SCOPE"


def test_register_model_run_not_found():
    response = client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": 99999,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"


# --- List and get tests ---


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_list_models(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    response = client.get("/models/", params={"project_id": 1})
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    names = [m["name"] for m in data]
    assert "fraud-detector" in names


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_list_models_scoped_to_project(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    response = client.get("/models/", params={"project_id": 999})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_get_model(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    response = client.get("/models/fraud-detector", params={"project_id": 1})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "fraud-detector"
    assert data["version"] == "v1.0.0"


def test_get_model_not_found():
    response = client.get("/models/unknown-model", params={"project_id": 1})
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "MODEL_NOT_FOUND"


# --- Version tests ---


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_list_model_versions(mock_delay):
    run_id1 = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id1,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    run_id2 = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v2.0.0",
            "run_id": run_id2,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    response = client.get("/models/fraud-detector/versions", params={"project_id": 1})
    assert response.status_code == 200
    data = response.json()
    versions = [v["version"] for v in data]
    assert "v1.0.0" in versions
    assert "v2.0.0" in versions


def test_list_model_versions_not_found():
    response = client.get("/models/unknown-model/versions", params={"project_id": 1})
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "MODEL_NOT_FOUND"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_get_model_version(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    response = client.get(
        "/models/fraud-detector/versions/v1.0.0", params={"project_id": 1}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "fraud-detector"
    assert data["version"] == "v1.0.0"


def test_get_model_version_not_found():
    response = client.get(
        "/models/fraud-detector/versions/v9.9.9", params={"project_id": 1}
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "MODEL_VERSION_NOT_FOUND"


# --- Promote tests ---


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_promote_none_to_staging(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    response = client.post(
        "/models/fraud-detector/versions/v1.0.0/promote",
        json={"stage": "staging"},
        params={"project_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] == "staging"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_promote_staging_to_production(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    # First promote to staging
    client.post(
        "/models/fraud-detector/versions/v1.0.0/promote",
        json={"stage": "staging"},
        params={"project_id": 1},
    )
    # Then promote to production
    response = client.post(
        "/models/fraud-detector/versions/v1.0.0/promote",
        json={"stage": "production"},
        params={"project_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] == "production"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_demote_production_to_staging(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "fraud-detector",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    # Promote to staging, then production
    client.post(
        "/models/fraud-detector/versions/v1.0.0/promote",
        json={"stage": "staging"},
        params={"project_id": 1},
    )
    client.post(
        "/models/fraud-detector/versions/v1.0.0/promote",
        json={"stage": "production"},
        params={"project_id": 1},
    )
    # Demote back to staging
    response = client.post(
        "/models/fraud-detector/versions/v1.0.0/promote",
        json={"stage": "staging"},
        params={"project_id": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["stage"] == "staging"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_promote_invalid_transition(mock_delay):
    run_id = _create_completed_run(1)
    client.post(
        "/models/",
        json={
            "name": "invalid-transition-model",
            "version": "v1.0.0",
            "run_id": run_id,
            "project_id": 1,
            "experiment_id": 1,
        },
    )
    # Try to go directly from none to production (invalid)
    response = client.post(
        "/models/invalid-transition-model/versions/v1.0.0/promote",
        json={"stage": "production"},
        params={"project_id": 1},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "RUN_NOT_IN_SCOPE"


@patch("backend.workers.tasks.training_tasks.start_training_run.delay")
def test_promote_model_not_found(mock_delay):
    response = client.post(
        "/models/unknown-model/versions/v1.0.0/promote",
        json={"stage": "staging"},
        params={"project_id": 1},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "MODEL_VERSION_NOT_FOUND"
