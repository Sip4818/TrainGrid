from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)


def test_create_experiment():
    response = client.post(
        "/experiments/",
        json={"project_id": 1, "name": "Exp A"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] > 0
    assert data["name"] == "Exp A"
    assert data["project_id"] == 1
    assert data["run_count"] == 0


def test_create_experiment_unknown_project():
    response = client.post(
        "/experiments/",
        json={"project_id": 999999, "name": "Bad"},
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"
    assert "project" in data["detail"]["message"].lower()


def test_list_experiments():
    response = client.get("/experiments/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_experiments_filtered_by_project():
    project = client.post("/projects/", json={"name": "Filter"}).json()
    client.post(
        "/experiments/",
        json={"project_id": project["id"], "name": "E1"},
    )
    client.post(
        "/experiments/",
        json={"project_id": project["id"], "name": "E2"},
    )
    response = client.get("/experiments/", params={"project_id": project["id"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(experiment["project_id"] == project["id"] for experiment in data)


def test_get_experiment():
    experiment = client.post(
        "/experiments/",
        json={"project_id": 1, "name": "Get me"},
    ).json()
    response = client.get(f"/experiments/{experiment['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Get me"


def test_get_experiment_not_found():
    response = client.get("/experiments/999999")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"
    assert "experiment" in data["detail"]["message"].lower()


def test_update_experiment():
    experiment = client.post(
        "/experiments/",
        json={"project_id": 1, "name": "Rename"},
    ).json()
    response = client.patch(
        f"/experiments/{experiment['id']}",
        json={"name": "Renamed"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Renamed"
    assert data["project_id"] == 1


def test_update_experiment_not_found():
    response = client.patch("/experiments/999999", json={"name": "Ghost"})
    assert response.status_code == 404


def test_delete_experiment():
    experiment = client.post(
        "/experiments/",
        json={"project_id": 1, "name": "Temp"},
    ).json()
    response = client.delete(f"/experiments/{experiment['id']}")
    assert response.status_code == 200
    assert client.get(f"/experiments/{experiment['id']}").status_code == 404


def test_delete_experiment_cascades_to_runs():
    experiment = client.post(
        "/experiments/",
        json={"project_id": 1, "name": "Cascade"},
    ).json()

    payload = {
        "experiment_id": experiment["id"],
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
        },
    }
    with patch(
        "backend.workers.tasks.training_tasks.start_training_run.delay"
    ) as mock_delay:
        response = client.post("/runs/", json=payload)
        assert response.status_code == 200
        run_id = response.json()["id"]
        mock_delay.assert_called_once_with(str(run_id))

    response = client.delete(f"/experiments/{experiment['id']}")
    assert response.status_code == 200
    assert client.get(f"/runs/{run_id}").status_code == 404


def test_experiment_run_count_reflects_runs():
    experiment = client.post(
        "/experiments/",
        json={"project_id": 1, "name": "Count"},
    ).json()

    payload = {
        "experiment_id": experiment["id"],
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
        },
    }
    with patch("backend.workers.tasks.training_tasks.start_training_run.delay"):
        client.post("/runs/", json=payload)

    response = client.get(f"/experiments/{experiment['id']}")
    assert response.status_code == 200
    assert response.json()["run_count"] == 1
