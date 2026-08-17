from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.schemas.project import Project, ProjectCreate, ProjectUpdate
from backend.api.services.project_service import ProjectService
from backend.infrastructure.database.session import get_db

logger = get_logger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=Project)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),  # noqa: B008
) -> Project:
    """Create a new project."""
    logger.info("Creating project name=%s", payload.name)
    return ProjectService(db).create_project(payload)


@router.get("/", response_model=list[Project])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:  # noqa: B008
    """List all projects with their nested experiments."""
    logger.info("Listing projects")
    return ProjectService(db).list_projects()


@router.get("/{project_id}", response_model=Project)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> Project:
    """Retrieve a single project with its nested experiments."""
    logger.info("Fetching project project_id=%d", project_id)
    return ProjectService(db).get_project(project_id)


@router.patch("/{project_id}", response_model=Project)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),  # noqa: B008
) -> Project:
    """Partially update a project."""
    logger.info("Updating project project_id=%d", project_id)
    return ProjectService(db).update_project(project_id, payload)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict[str, str]:
    """Delete a project, cascading to its experiments and their runs."""
    logger.info("Deleting project project_id=%d", project_id)
    ProjectService(db).delete_project(project_id)
    return {"detail": f"Project with id '{project_id}' deleted"}
