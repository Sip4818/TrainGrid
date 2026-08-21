from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)


def test_create_project():
    response = client.post(
        "/projects/",
        json={"name": "Alpha", "description": "first project"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] > 0
    assert data["name"] == "Alpha"
    assert data["description"] == "first project"
    assert data["experiments"] == []


def test_create_project_without_description():
    response = client.post("/projects/", json={"name": "Beta"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Beta"
    assert data["description"] is None


def test_list_projects():
    response = client.get("/projects/")
    assert response.status_code == 200
    projects = response.json()
    assert isinstance(projects, list)
    assert any(project["name"] == "Default Project" for project in projects)


def test_get_project_includes_nested_experiments():
    project = client.post("/projects/", json={"name": "Nested"}).json()
    client.post(
        "/experiments/",
        json={"project_id": project["id"], "name": "Exp A"},
    )
    response = client.get(f"/projects/{project['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Nested"
    assert any(experiment["name"] == "Exp A" for experiment in data["experiments"])


def test_get_project_not_found():
    response = client.get("/projects/999999")
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["code"] == "NOT_FOUND"
    assert "project" in data["detail"]["message"].lower()


def test_update_project():
    project = client.post("/projects/", json={"name": "Rename"}).json()
    response = client.patch(
        f"/projects/{project['id']}",
        json={"description": "updated description"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Rename"
    assert data["description"] == "updated description"


def test_update_project_not_found():
    response = client.patch("/projects/999999", json={"name": "Ghost"})
    assert response.status_code == 404


def test_delete_project():
    project = client.post("/projects/", json={"name": "Temp"}).json()
    response = client.delete(f"/projects/{project['id']}")
    assert response.status_code == 200
    assert client.get(f"/projects/{project['id']}").status_code == 404


def test_delete_project_cascades_to_experiments_and_runs():
    project = client.post("/projects/", json={"name": "Cascade"}).json()
    experiment = client.post(
        "/experiments/",
        json={"project_id": project["id"], "name": "Exp"},
    ).json()

    payload = {
        "experiment_id": experiment["id"],
        "project_id": project["id"],
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

    response = client.delete(f"/projects/{project['id']}")
    assert response.status_code == 200
    assert (
        client.get(
            f"/experiments/{experiment['id']}",
            params={"project_id": project["id"]},
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/runs/{run_id}",
            params={"project_id": project["id"], "experiment_id": experiment["id"]},
        ).status_code
        == 404
    )
