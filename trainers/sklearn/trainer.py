import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

from trainers.base import BaseTrainer
from .config import RandomForestClassifierConfig


class RandomForestClassifierTrainer(BaseTrainer):
    def __init__(self, config: RandomForestClassifierConfig):
        self.config = config
        self.data = None
        self.model = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None

    def load_data(self):
        self.data = pd.read_csv(self.config.dataset_path)

    def validate_data(self):
        features = self.config.feature_columns
        target = self.config.target_column
        if not all(col in self.data.columns for col in features + [target]):
            raise ValueError(
                "Some feature or target columns are missing in the dataset."
            )

    def preprocess_data(self):
        X = self.data[self.config.feature_columns]
        y = self.data[self.config.target_column]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        self.X_train = X_train
        self.X_test = X_test
        self.y_train = y_train
        self.y_test = y_test

    def train(self):
        self.load_data()
        self.validate_data()
        self.preprocess_data()

        model = RandomForestClassifier(
            n_estimators=self.config.n_estimators,
            max_depth=self.config.max_depth,
            random_state=42,
        )
        model.fit(self.X_train, self.y_train)
        self.model = model
        return self.model

    def evaluate(self) -> dict[str, float]:
        assert self.model is not None, "Model must be trained before evaluation"
        assert self.X_test is not None, "Data must be preprocessed before evaluation"
        assert self.y_test is not None, "Data must be preprocessed before evaluation"
        predictions = self.model.predict(self.X_test)
        accuracy = accuracy_score(self.y_test, predictions)
        return {"accuracy": float(accuracy)}

    def save(self, output_path: str) -> None:
        if self.model is not None:
            joblib.dump(self.model, output_path)
