from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)


def test_list_trainers():
    response = client.get("/trainers/")
    assert response.status_code == 200
    trainers = response.json()
    names = {t["name"] for t in trainers}
    assert names == {"random_forest", "xgboost"}


def test_trainer_labels_and_config_schemas():
    response = client.get("/trainers/")
    trainers = {t["name"]: t for t in response.json()}

    rf = trainers["random_forest"]
    assert rf["label"] == "Random Forest Classifier"
    rf_schema = rf["config_schema"]
    assert "n_estimators" in rf_schema["properties"]
    assert "max_depth" in rf_schema["properties"]

    xgb = trainers["xgboost"]
    assert xgb["label"] == "XGBoost Classifier"
    xgb_schema = xgb["config_schema"]
    assert "learning_rate" in xgb_schema["properties"]
    assert "max_depth" in xgb_schema["properties"]
