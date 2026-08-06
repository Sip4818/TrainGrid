import joblib  # type: ignore[import-untyped]

from backend.trainers.xgboost.config import XGBoostClassifierConfig
from backend.trainers.xgboost.trainer import XGBoostClassifierTrainer


def _make_trainer() -> XGBoostClassifierTrainer:
    config = XGBoostClassifierConfig(
        dataset_path="backend/datasets/sample.csv",
        target_column="target",
        feature_columns=["feature1", "feature2"],
        n_estimators=10,
        max_depth=3,
    )
    return XGBoostClassifierTrainer(config)


def test_train_fits_model():
    trainer = _make_trainer()

    model = trainer.train()

    assert trainer.model is not None
    assert model is trainer.model


def test_evaluate_returns_accuracy():
    trainer = _make_trainer()
    trainer.train()

    metrics = trainer.evaluate()

    assert "accuracy" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_save_persists_model(tmp_path):
    trainer = _make_trainer()
    trainer.train()

    output_path = str(tmp_path / "model.joblib")
    trainer.save(output_path)

    loaded = joblib.load(output_path)
    assert loaded is not None


def test_train_without_data_file_raises():
    trainer = XGBoostClassifierTrainer(
        XGBoostClassifierConfig(
            dataset_path="missing.csv",
            target_column="target",
            feature_columns=["feature1", "feature2"],
        )
    )

    try:
        trainer.train()
    except FileNotFoundError:
        return

    raise AssertionError("Expected FileNotFoundError for missing dataset")
