from unittest.mock import MagicMock, patch

import pandas as pd

from backend.trainers.xgboost.config import XGBoostClassifierConfig
from backend.trainers.xgboost.trainer import XGBoostClassifierTrainer


def _make_config() -> XGBoostClassifierConfig:
    return XGBoostClassifierConfig(
        dataset_path="dummy.csv",
        target_column="target",
        feature_columns=["feature1", "feature2"],
    )


def _make_trainer() -> XGBoostClassifierTrainer:
    return XGBoostClassifierTrainer(_make_config())


def test_train_fits_model_and_returns_it():
    trainer = _make_trainer()
    fake_model = MagicMock()

    with (
        patch("backend.trainers.xgboost.trainer.pd.read_csv") as mock_read_csv,
        patch("backend.trainers.xgboost.trainer.train_test_split") as mock_split,
        patch(
            "backend.trainers.xgboost.trainer.XGBClassifier",
            return_value=fake_model,
        ) as mock_cls,
    ):
        mock_read_csv.return_value = pd.DataFrame(
            {"feature1": [1.0, 2.0], "feature2": [3.0, 4.0], "target": [0, 1]}
        )
        mock_split.return_value = (
            pd.DataFrame({"feature1": [1.0], "feature2": [3.0]}),
            pd.DataFrame({"feature1": [2.0], "feature2": [4.0]}),
            pd.Series([0]),
            pd.Series([1]),
        )
        model = trainer.train()

    mock_cls.assert_called_once_with(
        n_estimators=100, max_depth=6, learning_rate=0.3, random_state=42
    )
    fake_model.fit.assert_called_once()
    assert model is fake_model
    assert trainer.model is fake_model


def test_train_raises_when_columns_missing():
    trainer = _make_trainer()

    with (
        patch("backend.trainers.xgboost.trainer.pd.read_csv") as mock_read_csv,
        patch("backend.trainers.xgboost.trainer.train_test_split"),
    ):
        mock_read_csv.return_value = pd.DataFrame({"foo": [1.0]})
        try:
            trainer.train()
        except ValueError:
            return

    raise AssertionError("Expected ValueError for missing columns")


def test_evaluate_returns_accuracy():
    trainer = _make_trainer()
    trainer.model = MagicMock()
    trainer.model.predict.return_value = [1, 0, 1]
    trainer.X_test = MagicMock()
    trainer.y_test = [1, 0, 1]

    metrics = trainer.evaluate()

    assert metrics["accuracy"] == 1.0
    trainer.model.predict.assert_called_once_with(trainer.X_test)


def test_save_persists_model(tmp_path):
    trainer = _make_trainer()
    trainer.model = MagicMock()
    output_path = str(tmp_path / "model.joblib")

    with patch("backend.trainers.xgboost.trainer.joblib.dump") as mock_dump:
        trainer.save(output_path)

    mock_dump.assert_called_once_with(trainer.model, output_path)
