from datetime import datetime

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from backend.infrastructure.database.session import Base
from backend.shared.enums import DeploymentStatus, ModelStage, RunStatus


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

    # SHA-256 hash of the dataset CSV, copied from DatasetModel.hash at run creation
    dataset_hash: Column = Column(String, nullable=True)

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

    # SHA-256 hash of the CSV content, computed at upload time
    hash: Column = Column(String, nullable=True)

    # Automatically set when the row is created
    created_at: Column = Column(DateTime, default=datetime.utcnow)


class RegisteredModel(Base):
    """
    SQLAlchemy model for the 'registered_models' table.
    A registered model is a versioned ML artifact promoted from a training run
    into the governed model store. Each row represents one version of a model.
    """

    __tablename__ = "registered_models"

    id: Column = Column(Integer, primary_key=True, index=True)

    # Model name (e.g. "fraud-detector") — many versions share the same name
    name: Column = Column(String, nullable=False, index=True)

    # Semver version string (e.g. "v1.0.0")
    version: Column = Column(String, nullable=False)

    # Which training run produced this model
    run_id: Column = Column(Integer, ForeignKey("runs.id"), nullable=False)

    # Direct FKs for project/experiment scoping (avoids 3-JOIN through
    # run → experiment → project)
    project_id: Column = Column(
        Integer, ForeignKey("projects.id"), nullable=False, index=True
    )
    experiment_id: Column = Column(
        Integer, ForeignKey("experiments.id"), nullable=False
    )

    # Lifecycle stage
    stage: Column = Column(SQLEnum(ModelStage), default=ModelStage.NONE)

    # Optional user-provided description
    description: Column = Column(String, nullable=True)

    # Store-relative key for the .joblib artifact (copied from run)
    artifact_path: Column = Column(String, nullable=False)

    # SHA-256 of the .joblib file (computed at registration time)
    artifact_checksum: Column = Column(String, nullable=True)

    # Dataset lineage (copied from RunModel.dataset_hash)
    dataset_hash: Column = Column(String, nullable=True)

    # Config and metrics copied from the run at registration time
    config: Column = Column(JSON, nullable=False)
    metrics: Column = Column(JSON, default={})

    created_at: Column = Column(DateTime, default=datetime.utcnow)
    updated_at: Column = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    run = relationship("RunModel")
    project = relationship("ProjectModel")
    experiment = relationship("ExperimentModel")

    __table_args__ = (
        UniqueConstraint("name", "version", name="uq_model_name_version"),
    )


class DeploymentModel(Base):
    """
    SQLAlchemy model for the 'deployments' table.
    A deployment loads a registered model artifact into the in-memory serving
    pool so it can receive prediction requests over HTTP.

    Project scope is traced through registered_model_id → RegisteredModel.project_id,
    not stored directly on this table.
    """

    __tablename__ = "deployments"

    id: Column = Column(Integer, primary_key=True, index=True)

    # The registered model being deployed
    model_name: Column = Column(String, nullable=False, index=True)
    model_version: Column = Column(String, nullable=False)
    registered_model_id: Column = Column(
        Integer, ForeignKey("registered_models.id"), nullable=False
    )

    # Deployment lifecycle status
    status: Column = Column(SQLEnum(DeploymentStatus), default=DeploymentStatus.PENDING)

    # Timestamps
    created_at: Column = Column(DateTime, default=datetime.utcnow)
    started_at: Column = Column(DateTime, nullable=True)
    stopped_at: Column = Column(DateTime, nullable=True)

    # Relationship to the registered model
    registered_model = relationship("RegisteredModel")

    @property
    def project_id(self) -> int:
        """Project owning this deployment, derived from the registered model."""
        return self.registered_model.project_id  # type: ignore[return-value]
