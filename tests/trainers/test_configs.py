import pytest
from pydantic import ValidationError

from backend.trainers.sklearn.config import RandomForestClassifierConfig
from backend.trainers.xgboost.config import XGBoostClassifierConfig


def test_config_applies_defaults():
    config = RandomForestClassifierConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
    )

    assert config.n_estimators == 100
    assert config.max_depth is None


def test_config_requires_required_fields():
    with pytest.raises(ValidationError):
        RandomForestClassifierConfig(
            target_column="target",
            feature_columns=["f1"],
        )


def test_config_rejects_unknown_field():
    with pytest.raises(ValidationError):
        RandomForestClassifierConfig(
            dataset_path="data.csv",
            target_column="target",
            feature_columns=["f1"],
            n_estimators=100,
            unknown_param=42,
        )


def test_xgboost_config_applies_defaults():
    config = XGBoostClassifierConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
    )

    assert config.n_estimators == 100
    assert config.max_depth == 6
    assert config.learning_rate == 0.3


def test_xgboost_config_requires_required_fields():
    with pytest.raises(ValidationError):
        XGBoostClassifierConfig(
            target_column="target",
            feature_columns=["f1"],
        )


def test_xgboost_config_rejects_unknown_field():
    with pytest.raises(ValidationError):
        XGBoostClassifierConfig(
            dataset_path="data.csv",
            target_column="target",
            feature_columns=["f1"],
            learning_rate=0.1,
            unknown_param=42,
        )
