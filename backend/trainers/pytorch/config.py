from pydantic import Field

from backend.trainers.configs.classification import ClassificationConfig


class PyTorchMLPConfig(ClassificationConfig):
    dataset_path: str = Field(
        ..., json_schema_extra={"x_widget": "dataset"}, description="Dataset path"
    )
    feature_columns: list[str]

    # Architecture
    hidden_dims: list[int] = Field(default=[128, 64])
    # Activation per hidden layer. If string, broadcasts to all layers.
    # If list, must match len(hidden_dims).
    # Supported: relu, leaky_relu, gelu, tanh, selu.
    activation: str | list[str] = Field(default="relu")
    dropout: float = Field(default=0.2)

    # Training
    epochs: int = Field(default=50)
    batch_size: int = Field(default=32)
    learning_rate: float = Field(default=1e-3)
    optimizer: str = Field(default="adam")
    weight_decay: float = Field(default=0.0)

    # Callbacks
    early_stopping_patience: int = Field(default=5)
    early_stopping_min_delta: float = Field(default=0.0)
    checkpoint_enabled: bool = Field(default=True)
