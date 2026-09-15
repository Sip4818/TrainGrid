from __future__ import annotations

import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, TensorDataset

from backend.trainers.base import BaseTrainer
from backend.trainers.registry import trainer_registry

from .config import PyTorchMLPConfig

ACTIVATION_MAP: dict[str, type[nn.Module]] = {
    "relu": nn.ReLU,
    "leaky_relu": nn.LeakyReLU,
    "gelu": nn.GELU,
    "tanh": nn.Tanh,
    "selu": nn.SELU,
}


def _resolve_activations(
    activation: str | list[str], hidden_dims: list[int]
) -> list[str]:
    """Resolve activation specification into a list matching hidden_dims length."""
    if isinstance(activation, str):
        return [activation] * len(hidden_dims)
    if len(activation) != len(hidden_dims):
        raise ValueError(
            f"activation list length ({len(activation)}) must match "
            f"hidden_dims length ({len(hidden_dims)})"
        )
    return list(activation)


class MLP(nn.Module):
    def __init__(
        self,
        input_dim: int,
        hidden_dims: list[int],
        activations: list[str],
        dropout: float,
        num_classes: int,
    ) -> None:
        super().__init__()
        layers: list[nn.Module] = []
        prev_dim = input_dim
        for dim, act_name in zip(hidden_dims, activations):
            layers.append(nn.Linear(prev_dim, dim))
            layers.append(ACTIVATION_MAP[act_name]())
            layers.append(nn.Dropout(dropout))
            prev_dim = dim
        layers.append(nn.Linear(prev_dim, num_classes))
        self.network = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


class PyTorchMLPTrainer(BaseTrainer):
    config_class = PyTorchMLPConfig  # type: ignore[assignment]
    label = "PyTorch MLP Classifier"
    model_extension = ".pt"  # type: ignore[assignment]

    def __init__(self, config: PyTorchMLPConfig) -> None:
        self.config = config
        self.model: MLP | None = None
        self.X_train: torch.Tensor | None = None
        self.X_test: torch.Tensor | None = None
        self.y_train: torch.Tensor | None = None
        self.y_test: torch.Tensor | None = None

    def load_data(self) -> pd.DataFrame:
        return pd.read_csv(self.config.dataset_path)

    def validate_data(self, df: pd.DataFrame) -> None:
        features = self.config.feature_columns
        target = self.config.target_column
        if not all(col in df.columns for col in features + [target]):
            raise ValueError(
                "Some feature or target columns are missing in the dataset."
            )

    def preprocess_data(self, df: pd.DataFrame) -> None:
        X = df[self.config.feature_columns].values.astype("float32")
        y = df[self.config.target_column].values.astype("int64")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        self.X_train = torch.tensor(X_train)
        self.X_test = torch.tensor(X_test)
        self.y_train = torch.tensor(y_train)
        self.y_test = torch.tensor(y_test)

    def train(self) -> MLP:
        df = self.load_data()
        self.validate_data(df)
        self.preprocess_data(df)

        assert self.X_train is not None
        assert self.y_train is not None

        num_classes = len(torch.unique(self.y_train))
        input_dim = self.X_train.shape[1]

        activations = _resolve_activations(
            self.config.activation, self.config.hidden_dims
        )

        self.model = MLP(
            input_dim=input_dim,
            hidden_dims=self.config.hidden_dims,
            activations=activations,
            dropout=self.config.dropout,
            num_classes=num_classes,
        )

        optimizer: torch.optim.Optimizer
        if self.config.optimizer == "adam":
            optimizer = torch.optim.Adam(
                self.model.parameters(),
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay,
            )
        elif self.config.optimizer == "sgd":
            optimizer = torch.optim.SGD(
                self.model.parameters(),
                lr=self.config.learning_rate,
                weight_decay=self.config.weight_decay,
            )
        else:
            raise ValueError(f"Unsupported optimizer: {self.config.optimizer}")

        criterion = nn.CrossEntropyLoss()

        dataset = TensorDataset(self.X_train, self.y_train)
        dataloader = DataLoader(
            dataset, batch_size=self.config.batch_size, shuffle=True
        )

        best_val_loss = float("inf")
        best_state = None
        epochs_without_improvement = 0

        self.model.train()
        for _ in range(self.config.epochs):
            # Train phase
            for X_batch, y_batch in dataloader:
                optimizer.zero_grad()
                output = self.model(X_batch)
                loss = criterion(output, y_batch)
                loss.backward()
                optimizer.step()

            # Validation phase
            self.model.eval()
            with torch.no_grad():
                val_output = self.model(self.X_test)
                val_loss = criterion(val_output, self.y_test)
            self.model.train()

            # Early stopping check
            if val_loss.item() < best_val_loss - self.config.early_stopping_min_delta:
                best_val_loss = val_loss.item()
                best_state = {k: v.clone() for k, v in self.model.state_dict().items()}
                epochs_without_improvement = 0
            else:
                epochs_without_improvement += 1

            if epochs_without_improvement >= self.config.early_stopping_patience:
                break

        # Restore best weights
        if best_state is not None:
            self.model.load_state_dict(best_state)

        return self.model

    def evaluate(self) -> dict[str, float]:
        assert self.model is not None
        assert self.X_test is not None
        assert self.y_test is not None

        self.model.eval()
        with torch.no_grad():
            output = self.model(self.X_test)
            predictions = output.argmax(dim=1)

        accuracy = accuracy_score(self.y_test.numpy(), predictions.numpy())
        return {"accuracy": float(accuracy)}

    def save(self, output_path: str) -> None:
        if self.model is not None:
            torch.save(self.model.state_dict(), output_path)

    def predict(self, input_data: dict) -> dict:
        assert self.model is not None

        self.model.eval()
        input_tensor = torch.tensor([list(input_data.values())], dtype=torch.float32)
        with torch.no_grad():
            output = self.model(input_tensor)
            probabilities = torch.softmax(output, dim=1)
            prediction = output.argmax(dim=1).item()
            confidence = probabilities.max().item()

        return {"prediction": prediction, "confidence": confidence}


trainer_registry.register("pytorch_mlp", PyTorchMLPTrainer)
