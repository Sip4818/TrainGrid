# Scikit-learn trainer configs will live here.

from dataclasses import dataclass


@dataclass
class RandomForestClassifierConfig:
    dataset_path: str
    target_column: str
    feature_columns: list
    n_estimators: int = 100
    max_depth: int | None = None
