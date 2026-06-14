from abc import ABC, abstractmethod
from pathlib import Path


class ArtifactStore(ABC):
    @abstractmethod
    def save(self, source_path: Path, artifact_path: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def load(self, artifact_path: str, destination_path: Path) -> Path:
        raise NotImplementedError
