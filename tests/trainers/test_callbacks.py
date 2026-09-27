"""Tests for the Layer 1 training callback protocol (#89).

Trainers report progress by invoking an optional ``on_event`` callback.
These tests run the real data pipeline on tiny CSVs and collect events
into plain lists — no mocks, no Redis involved.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.trainers.pytorch.config import PyTorchMLPConfig
from backend.trainers.pytorch.trainer import PyTorchMLPTrainer
from backend.trainers.sklearn.config import RandomForestClassifierConfig
from backend.trainers.sklearn.trainer import RandomForestClassifierTrainer
from backend.trainers.xgboost.config import XGBoostClassifierConfig
from backend.trainers.xgboost.trainer import XGBoostClassifierTrainer


def _tiny_csv(tmp_path: Path) -> str:
    path = tmp_path / "data.csv"
    path.write_text(
        "f1,f2,target\n"
        "0.1,0.2,0\n"
        "0.2,0.1,0\n"
        "0.9,0.8,1\n"
        "0.8,0.9,1\n"
        "0.15,0.25,0\n"
        "0.85,0.75,1\n"
        "0.3,0.2,0\n"
        "0.7,0.8,1\n"
        "0.25,0.15,0\n"
        "0.75,0.85,1\n"
    )
    return str(path)


def test_pytorch_emits_one_event_per_epoch(tmp_path):
    config = PyTorchMLPConfig(
        dataset_path=_tiny_csv(tmp_path),
        target_column="target",
        feature_columns=["f1", "f2"],
        hidden_dims=[8],
        epochs=2,
        batch_size=4,
    )
    trainer = PyTorchMLPTrainer(config)
    seen: list[dict[str, Any]] = []

    trainer.train(on_event=seen.append)

    assert len(seen) == 2
    assert [e["epoch"] for e in seen] == [1, 2]
    for event in seen:
        assert event["type"] == "epoch"
        assert event["total_epochs"] == 2
        assert isinstance(event["loss"], float)
        assert isinstance(event["val_loss"], float)


def test_pytorch_train_without_callback_still_works(tmp_path):
    config = PyTorchMLPConfig(
        dataset_path=_tiny_csv(tmp_path),
        target_column="target",
        feature_columns=["f1", "f2"],
        hidden_dims=[8],
        epochs=1,
        batch_size=4,
    )
    trainer = PyTorchMLPTrainer(config)

    model = trainer.train()

    assert model is not None


def test_xgboost_emits_single_completion_event(tmp_path):
    config = XGBoostClassifierConfig(
        dataset_path=_tiny_csv(tmp_path),
        target_column="target",
        feature_columns=["f1", "f2"],
        n_estimators=5,
    )
    trainer = XGBoostClassifierTrainer(config)
    seen: list[dict[str, Any]] = []

    trainer.train(on_event=seen.append)

    assert len(seen) == 1
    (event,) = seen
    assert event["type"] == "epoch"
    assert event["epoch"] == 1
    assert event["total_epochs"] == 1
    assert 0.0 <= event["accuracy"] <= 1.0


def test_sklearn_ignores_callback_but_trains(tmp_path):
    config = RandomForestClassifierConfig(
        dataset_path=_tiny_csv(tmp_path),
        target_column="target",
        feature_columns=["f1", "f2"],
        n_estimators=5,
    )
    trainer = RandomForestClassifierTrainer(config)
    seen: list[dict[str, Any]] = []

    model = trainer.train(on_event=seen.append)

    # RandomForest.fit() is atomic: no intermediate events, but training
    # itself must be unaffected by the ignored callback.
    assert seen == []
    assert model is not None
    assert trainer.model is not None
