from sqlalchemy import Column, Integer, String, JSON, DateTime, Enum as SQLEnum
from infrastructure.database.session import Base
from datetime import datetime
from shared.enums import RunStatus


class RunModel(Base):
    """
    SQLAlchemy model for the 'runs' table.
    This defines exactly how a training run is stored in the database.
    """

    __tablename__ = "runs"

    # Primary key, indexed for fast lookups
    id: Column = Column(Integer, primary_key=True, index=True)

    # Links this run to a specific experiment
    experiment_id: Column = Column(Integer, index=True)

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
