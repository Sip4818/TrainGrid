from pydantic import Field

from backend.trainers.configs.classification import ClassificationConfig


class XGBoostClassifierConfig(ClassificationConfig):
    dataset_path: str = Field(
        ..., json_schema_extra={"x_widget": "dataset"}, description="Dataset path"
    )
    feature_columns: list[str]
    n_estimators: int = 100
    max_depth: int = 6
    learning_rate: float = 0.3
