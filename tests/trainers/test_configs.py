import pytest

from backend.trainers.sklearn.config import RandomForestClassifierConfig


def test_config_applies_defaults():
    config = RandomForestClassifierConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
    )

    assert config.n_estimators == 100
    assert config.max_depth is None


def test_config_requires_required_fields():
    with pytest.raises(TypeError):
        RandomForestClassifierConfig(
            target_column="target",
            feature_columns=["f1"],
        )


def test_config_rejects_unknown_field():
    with pytest.raises(TypeError):
        RandomForestClassifierConfig(
            dataset_path="data.csv",
            target_column="target",
            feature_columns=["f1"],
            n_estimators=100,
            unknown_param=42,
        )
