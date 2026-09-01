from enum import Enum


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ModelStage(str, Enum):
    NONE = "none"
    STAGING = "staging"
    PRODUCTION = "production"
    ARCHIVED = "archived"


class DeploymentStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    FAILED = "failed"
    STOPPED = "stopped"
