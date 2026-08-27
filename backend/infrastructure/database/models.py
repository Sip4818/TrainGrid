from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from backend.infrastructure.database.session import Base
from backend.shared.enums import RunStatus


class ProjectModel(Base):
    """
    SQLAlchemy model for the 'projects' table.
    A project owns experiments; deleting a project cascades to its
    experiments and, through them, to their runs.
    """

    __tablename__ = "projects"

    # Primary key, indexed for fast lookups
    id: Column = Column(Integer, primary_key=True, index=True)

    # Human-readable project name
    name: Column = Column(String, nullable=False)

    # Optional free-form description of the project
    description: Column = Column(String, nullable=True)

    # Automatically set when the row is created
    created_at: Column = Column(DateTime, default=datetime.utcnow)

    # Project has many experiments
    experiments = relationship(
        "ExperimentModel",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class ExperimentModel(Base):
    """
    SQLAlchemy model for the 'experiments' table.
    An experiment belongs to a project and owns its training runs.
    """

    __tablename__ = "experiments"

    # Primary key, indexed for fast lookups
    id: Column = Column(Integer, primary_key=True, index=True)

    # Links this experiment to its owning project
    project_id: Column = Column(
        Integer, ForeignKey("projects.id"), nullable=False, index=True
    )

    # Human-readable experiment name
    name: Column = Column(String, nullable=False)

    # Automatically set when the row is created
    created_at: Column = Column(DateTime, default=datetime.utcnow)

    # Experiment belongs to a project
    project = relationship("ProjectModel", back_populates="experiments")

    # Experiment has many runs
    runs = relationship(
        "RunModel",
        back_populates="experiment",
        cascade="all, delete-orphan",
    )


class RunModel(Base):
    """
    SQLAlchemy model for the 'runs' table.
    This defines exactly how a training run is stored in the database.
    """

    __tablename__ = "runs"

    # Primary key, indexed for fast lookups
    id: Column = Column(Integer, primary_key=True, index=True)

    # Links this run to a specific experiment
    experiment_id: Column = Column(Integer, ForeignKey("experiments.id"), index=True)

    # The current status of the run (PENDING, RUNNING, COMPLETED, etc.)
    status: Column = Column(SQLEnum(RunStatus), default=RunStatus.PENDING)

    # JSON column for model hyperparameters (e.g. n_estimators, max_depth)
    config: Column = Column(JSON, nullable=False)

    # JSON column for training results (e.g. accuracy, f1_score)
    metrics: Column = Column(JSON, default={})

    # String path to where the trained model file (.joblib) is saved on disk
    artifact_path: Column = Column(String, nullable=True)

    # Automatically set when the row is created
    created_at: Column = Column(DateTime, default=datetime.utcnow)

    # Set when the training task actually starts
    started_at: Column = Column(DateTime, nullable=True)

    # Set when the training task finishes or fails
    finished_at: Column = Column(DateTime, nullable=True)

    # Run belongs to an experiment
    experiment = relationship("ExperimentModel", back_populates="runs")

    @property
    def project_id(self) -> int:
        """Project owning this run, derived from the parent experiment."""
        return self.experiment.project_id  # type: ignore[return-value]


class DatasetModel(Base):
    """
    SQLAlchemy model for the 'datasets' table.
    Tracks user-uploaded CSV datasets so training runs can reference them via
    the artifact-store key 'datasets/{id}/dataset.csv', which both the API and
    the Celery worker can read from the shared artifacts volume.
    """

    __tablename__ = "datasets"

    # Primary key, indexed for fast lookups
    id: Column = Column(Integer, primary_key=True, index=True)

    # Display name of the uploaded file (defaults to the original filename)
    name: Column = Column(String, nullable=False)

    # Size of the uploaded file in bytes
    size_bytes: Column = Column(Integer, nullable=False)

    # Automatically set when the row is created
    created_at: Column = Column(DateTime, default=datetime.utcnow)
