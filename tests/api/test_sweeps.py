from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app
from backend.infrastructure.database.models import DatasetModel
from backend.infrastructure.database.session import SessionLocal

client = TestClient(app)


def _create_dataset() -> None:
    db = SessionLocal()
    try:
        if db.get(DatasetModel, 1) is None:
            db.add(DatasetModel(name="sweep-data.csv", size_bytes=64, hash="abc123"))
            db.commit()
    finally:
        db.close()


def _payload(**overrides):
    body = {
        "experiment_id": 1,
        "project_id": 1,
        "trainer_name": "random_forest",
        "dataset_path": "datasets/1/dataset.csv",
        "target_column": "target",
        "feature_columns": ["f1", "f2"],
        "search_space": {"n_estimators": [100, 200], "max_depth": [5, 10]},
        "strategy": "grid",
    }
    body.update(overrides)
    return body


def _create_sweep(**overrides):
    _create_dataset()
    with patch("celery.chord"):
        response = client.post("/sweeps/", json=_payload(**overrides))
    return response


# --- Creation tests ---


def test_create_grid_sweep():
    response = _create_sweep()
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "running"
    assert data["strategy"] == "grid"
    assert len(data["run_ids"]) == 4
    assert data["best_run_id"] is None
    assert data["started_at"] is not None


def test_create_random_sweep():
    response = _create_sweep(
        strategy="random",
        max_combinations=2,
        search_space={"n_estimators": [10, 20, 30], "max_depth": [3, 5]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "running"
    assert len(data["run_ids"]) == 2


def test_create_sweep_invalid_trainer():
    response = _create_sweep(trainer_name="nope")
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "TRAINER_NOT_FOUND"


def test_create_sweep_unknown_search_key():
    response = _create_sweep(search_space={"n_estimaters": [100]})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SEARCH_SPACE"


def test_create_sweep_dataset_key_not_searchable():
    response = _create_sweep(search_space={"dataset_path": ["a", "b"]})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SEARCH_SPACE"


def test_create_sweep_empty_search_space():
    response = _create_sweep(search_space={})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SEARCH_SPACE"


def test_create_sweep_empty_value_list():
    response = _create_sweep(search_space={"n_estimators": []})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SEARCH_SPACE"


def test_create_sweep_over_combo_cap():
    response = _create_sweep(
        search_space={
            "n_estimators": list(range(11)),
            "max_depth": list(range(11)),
        }
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SEARCH_SPACE"


def test_create_sweep_random_without_max():
    _create_dataset()
    with patch("celery.chord"):
        response = client.post("/sweeps/", json=_payload(strategy="random"))
    assert response.status_code == 422


def test_create_sweep_unknown_dataset():
    response = _create_sweep(dataset_path="datasets/999/dataset.csv")
    assert response.status_code == 404


def test_create_sweep_unknown_experiment():
    response = _create_sweep(experiment_id=99999)
    assert response.status_code == 404


# --- Read tests ---


def test_list_sweeps():
    _create_sweep()
    response = client.get("/sweeps/?project_id=1&experiment_id=1")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_get_sweep():
    created = _create_sweep().json()
    response = client.get(f"/sweeps/{created['id']}?project_id=1&experiment_id=1")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created["id"]
    assert data["run_ids"] == created["run_ids"]


def test_get_sweep_not_found():
    response = client.get("/sweeps/99999?project_id=1&experiment_id=1")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "SWEEP_NOT_FOUND"
