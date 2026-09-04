from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.api.main import app
from backend.infrastructure.database.models import (
    DeploymentModel,
    ExperimentModel,
    RunModel,
)
from backend.infrastructure.database.session import SessionLocal
from backend.shared.enums import RunStatus

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_deployments():
    """Remove all deployment records before each test to avoid cross-test pollution."""
    db = SessionLocal()
    try:
        db.query(DeploymentModel).delete()
        db.commit()
    finally:
        db.close()
    yield
    # Cleanup after test too
    db = SessionLocal()
    try:
        db.query(DeploymentModel).delete()
        db.commit()
    finally:
        db.close()


_test_counter = 0


def _next_name(prefix: str = "model") -> str:
    global _test_counter
    _test_counter += 1
    return f"{prefix}-{_test_counter}"


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
        run.status = RunStatus.COMPLETED  # type: ignore[assignment]
        run.metrics = {"accuracy": 0.95}  # type: ignore[assignment]
        run.artifact_path = f"runs/{run_id}/model.joblib"  # type: ignore[assignment]
        db.commit()
        return run_id
    finally:
        db.close()


def _register_model(name: str, version: str = "v1.0.0", project_id: int = 1) -> dict:
    run_id = _create_completed_run(1)
    response = client.post(
        "/models/",
        json={
            "name": name,
            "version": version,
            "run_id": run_id,
            "project_id": project_id,
            "experiment_id": 1,
        },
    )
    assert response.status_code == 201
    return response.json()


def _mock_model(feature_names=None):
    """Create a mock model with optional feature_names_in_."""
    mock_model = MagicMock()
    if feature_names:
        mock_model.feature_names_in_ = feature_names
    mock_model.predict.return_value = np.array([1])
    mock_model.predict_proba.return_value = np.array([[0.2, 0.8]])
    return mock_model


PID = 1  # Default project ID used in all tests


# --- Deploy tests ---


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_deploy_model(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("deploy")
    _register_model(name, "v1.0.0")

    response = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["model_name"] == name
    assert data["status"] == "active"


def test_deploy_model_not_in_registry():
    response = client.post(
        "/deployments/",
        json={
            "model_name": "nonexistent-xyz",
            "model_version": "v1.0.0",
            "project_id": PID,
        },
    )
    assert response.status_code == 404


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_deploy_model_already_deployed(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("dup")
    _register_model(name, "v1.0.0")

    r1 = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    assert r1.status_code == 201

    r2 = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    assert r2.status_code == 409


# --- List / Get tests ---


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_list_deployments(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("list")
    _register_model(name, "v1.0.0")
    client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )

    response = client.get(f"/deployments/?project_id={PID}")
    assert response.status_code == 200
    data = response.json()
    assert any(d["model_name"] == name for d in data)


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_get_deployment(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("get")
    _register_model(name, "v1.0.0")
    deploy_resp = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    deployment_id = deploy_resp.json()["id"]

    response = client.get(f"/deployments/{deployment_id}?project_id={PID}")
    assert response.status_code == 200
    assert response.json()["model_name"] == name


def test_get_deployment_not_found():
    response = client.get(f"/deployments/99999?project_id={PID}")
    assert response.status_code == 404


# --- Undeploy tests ---


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_undeploy_model(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("undeploy")
    _register_model(name, "v1.0.0")
    deploy_resp = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    deployment_id = deploy_resp.json()["id"]

    response = client.delete(f"/deployments/{deployment_id}?project_id={PID}")
    assert response.status_code == 200
    assert response.json()["status"] == "stopped"


def test_undeploy_deployment_not_found():
    response = client.delete(f"/deployments/99999?project_id={PID}")
    assert response.status_code == 404


# --- Predict tests ---


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_predict_single(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("predict-single")
    _register_model(name, "v1.0.0")
    deploy_resp = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    deployment_id = deploy_resp.json()["id"]

    response = client.post(
        f"/deployments/{deployment_id}/predict?project_id={PID}",
        json={"features": {"f1": 1.0, "f2": 2.0}},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["predictions"]) == 1
    assert data["predictions"][0]["prediction"] == 1
    assert data["predictions"][0]["confidence"] == 0.8
    assert data["model"] == f"{name}:v1.0.0"


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_predict_batch(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_model = _mock_model(["f1", "f2"])
    mock_model.predict.return_value = np.array([0, 1])
    mock_model.predict_proba.return_value = np.array([[0.9, 0.1], [0.2, 0.8]])
    mock_joblib.load.return_value = mock_model

    name = _next_name("predict-batch")
    _register_model(name, "v1.0.0")
    deploy_resp = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    deployment_id = deploy_resp.json()["id"]

    response = client.post(
        f"/deployments/{deployment_id}/predict?project_id={PID}",
        json={"features": [{"f1": 1.0, "f2": 2.0}, {"f1": 3.0, "f2": 4.0}]},
    )
    assert response.status_code == 200
    assert len(response.json()["predictions"]) == 2


def test_predict_deployment_not_found():
    response = client.post(
        f"/deployments/99999/predict?project_id={PID}",
        json={"features": {"f1": 1.0}},
    )
    assert response.status_code == 404


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_predict_feature_validation_error(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("predict-features")
    _register_model(name, "v1.0.0")
    deploy_resp = client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )
    deployment_id = deploy_resp.json()["id"]

    response = client.post(
        f"/deployments/{deployment_id}/predict?project_id={PID}",
        json={"features": {"f1": 1.0}},  # missing f2
    )
    assert response.status_code == 500


@patch("backend.api.services.deployment_service.serving_pool", {})
@patch("backend.api.services.deployment_service.joblib")
@patch("backend.api.services.deployment_service.local_artifact_store")
def test_predict_by_model_name(mock_store, mock_joblib):
    mock_store.load.return_value = "/tmp/model.joblib"
    mock_joblib.load.return_value = _mock_model(["f1", "f2"])

    name = _next_name("predict-name")
    _register_model(name, "v1.0.0")
    client.post(
        "/deployments/",
        json={"model_name": name, "model_version": "v1.0.0", "project_id": PID},
    )

    response = client.post(
        f"/models/{name}/predict?project_id={PID}",
        json={"features": {"f1": 1.0, "f2": 2.0}},
    )
    assert response.status_code == 200
    assert response.json()["predictions"][0]["prediction"] == 1


def test_predict_by_model_name_no_deployment():
    response = client.post(
        f"/models/nonexistent-abc/predict?project_id={PID}",
        json={"features": {"f1": 1.0}},
    )
    assert response.status_code == 404
