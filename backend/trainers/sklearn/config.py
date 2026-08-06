from backend.trainers.configs.classification import ClassificationConfig


class RandomForestClassifierConfig(ClassificationConfig):
    dataset_path: str
    feature_columns: list[str]
    n_estimators: int = 100
    max_depth: int | None = None
