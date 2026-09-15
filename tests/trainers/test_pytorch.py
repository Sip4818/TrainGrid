from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from backend.trainers.pytorch.config import PyTorchMLPConfig
from backend.trainers.pytorch.trainer import (
    MLP,
    PyTorchMLPTrainer,
    _resolve_activations,
)


def test_config_applies_defaults():
    config = PyTorchMLPConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
    )

    assert config.hidden_dims == [128, 64]
    assert config.activation == "relu"
    assert config.dropout == 0.2
    assert config.epochs == 50
    assert config.batch_size == 32
    assert config.learning_rate == 1e-3
    assert config.optimizer == "adam"
    assert config.weight_decay == 0.0
    assert config.early_stopping_patience == 5
    assert config.early_stopping_min_delta == 0.0
    assert config.checkpoint_enabled is True


def test_config_requires_required_fields():
    with pytest.raises(ValidationError):
        PyTorchMLPConfig(
            target_column="target",
            feature_columns=["f1"],
        )


def test_config_rejects_unknown_field():
    with pytest.raises(ValidationError):
        PyTorchMLPConfig(
            dataset_path="data.csv",
            target_column="target",
            feature_columns=["f1"],
            epochs=10,
            unknown_param=42,
        )


def test_activation_string_broadcasts():
    result = _resolve_activations("relu", [128, 64])

    assert result == ["relu", "relu"]


def test_activation_list_validated():
    with pytest.raises(ValueError, match="activation list length"):
        _resolve_activations(["relu"], [128, 64])


def test_activation_list_works():
    result = _resolve_activations(["relu", "gelu"], [128, 64])

    assert result == ["relu", "gelu"]


@patch("backend.trainers.pytorch.trainer.TensorDataset")
@patch("backend.trainers.pytorch.trainer.DataLoader")
@patch("backend.trainers.pytorch.trainer.train_test_split")
def test_train_fits_model(mock_split, mock_loader, mock_dataset):
    import torch

    mock_split.return_value = (
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
    )

    config = PyTorchMLPConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
        epochs=2,
        batch_size=32,
    )
    trainer = PyTorchMLPTrainer(config)

    import pandas as pd

    trainer.load_data = MagicMock(
        return_value=pd.DataFrame({"f1": [1, 2], "target": [0, 1]})
    )
    trainer.validate_data = MagicMock()
    trainer.preprocess_data = MagicMock()
    trainer.X_train = torch.randn(10, 1)
    trainer.y_train = torch.tensor([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
    trainer.X_test = torch.randn(5, 1)
    trainer.y_test = torch.tensor([0, 1, 0, 1, 0])

    model = trainer.train()

    assert model is not None
    assert trainer.model is not None


@patch("backend.trainers.pytorch.trainer.TensorDataset")
@patch("backend.trainers.pytorch.trainer.DataLoader")
@patch("backend.trainers.pytorch.trainer.train_test_split")
def test_train_early_stopping(mock_split, mock_loader, mock_dataset):
    import torch

    mock_split.return_value = (
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
    )

    config = PyTorchMLPConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
        epochs=100,
        batch_size=32,
        early_stopping_patience=2,
    )
    trainer = PyTorchMLPTrainer(config)

    import pandas as pd

    trainer.load_data = MagicMock(
        return_value=pd.DataFrame({"f1": [1, 2], "target": [0, 1]})
    )
    trainer.validate_data = MagicMock()
    trainer.preprocess_data = MagicMock()
    trainer.X_train = torch.randn(10, 1)
    trainer.y_train = torch.tensor([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
    trainer.X_test = torch.randn(5, 1)
    trainer.y_test = torch.tensor([0, 1, 0, 1, 0])

    model = trainer.train()

    assert model is not None


@patch("backend.trainers.pytorch.trainer.TensorDataset")
@patch("backend.trainers.pytorch.trainer.DataLoader")
@patch("backend.trainers.pytorch.trainer.train_test_split")
def test_evaluate_returns_accuracy(mock_split, mock_loader, mock_dataset):
    import torch

    mock_split.return_value = (
        MagicMock(),
        MagicMock(),
        MagicMock(),
        MagicMock(),
    )

    config = PyTorchMLPConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
        epochs=1,
        batch_size=32,
    )
    trainer = PyTorchMLPTrainer(config)

    import pandas as pd

    trainer.load_data = MagicMock(
        return_value=pd.DataFrame({"f1": [1, 2], "target": [0, 1]})
    )
    trainer.validate_data = MagicMock()
    trainer.preprocess_data = MagicMock()
    trainer.X_train = torch.randn(10, 1)
    trainer.y_train = torch.tensor([0, 1, 0, 1, 0, 1, 0, 1, 0, 1])
    trainer.X_test = torch.randn(5, 1)
    trainer.y_test = torch.tensor([0, 1, 0, 1, 0])

    trainer.train()
    metrics = trainer.evaluate()

    assert "accuracy" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_save_persists_model(tmp_path):
    import torch

    config = PyTorchMLPConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
    )
    trainer = PyTorchMLPTrainer(config)
    trainer.model = MLP(
        input_dim=1,
        hidden_dims=[16],
        activations=["relu"],
        dropout=0.0,
        num_classes=2,
    )

    output_path = tmp_path / "model.pt"
    trainer.save(str(output_path))

    assert output_path.exists()
    state_dict = torch.load(output_path, weights_only=True)
    assert "network.0.weight" in state_dict


def test_predict_returns_result():

    config = PyTorchMLPConfig(
        dataset_path="data.csv",
        target_column="target",
        feature_columns=["f1"],
    )
    trainer = PyTorchMLPTrainer(config)
    trainer.model = MLP(
        input_dim=1,
        hidden_dims=[16],
        activations=["relu"],
        dropout=0.0,
        num_classes=2,
    )

    result = trainer.predict({"f1": 1.0})

    assert "prediction" in result
    assert "confidence" in result
    assert isinstance(result["prediction"], int)
    assert 0.0 <= result["confidence"] <= 1.0


def test_self_registration():
    from backend.trainers.registration import register_all
    from backend.trainers.registry import trainer_registry

    register_all()

    assert trainer_registry.get("pytorch_mlp") is PyTorchMLPTrainer


def test_model_extension_is_pt():
    assert PyTorchMLPTrainer.model_extension == ".pt"
