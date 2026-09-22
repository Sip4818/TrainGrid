from celery import Celery  # type: ignore[import-untyped]
from celery.signals import task_postrun, task_prerun  # type: ignore[import-untyped]

from backend.api.core.config import settings
from backend.api.middleware.correlation import CORRELATION_ID_HEADER
from backend.shared.context import reset_correlation_id, set_correlation_id
from backend.trainers.registration import register_all

celery_app = Celery("traingrid")

celery_app.conf.update(
    broker_url=settings.celery_broker_url,
    result_backend=settings.celery_result_backend,
    imports=[
        "backend.workers.tasks.training_tasks",
        "backend.workers.tasks.sweep_tasks",
    ],
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
)

# Populate the trainer registry before any task resolves a trainer by name.
register_all()


@task_prerun.connect
def bind_correlation_id(task, **kwargs) -> None:  # type: ignore[no-untyped-def]
    """Bind the enqueueing request's correlation ID for the task duration.

    The API passes the ID via task headers (see RunService.create_run);
    the request is already on the task's stack when this signal fires.
    """
    headers = task.request.headers or {}
    token = set_correlation_id(headers.get(CORRELATION_ID_HEADER))
    task.request.correlation_id_token = token


@task_postrun.connect
def unbind_correlation_id(task, **kwargs) -> None:  # type: ignore[no-untyped-def]
    """Restore the worker's previous correlation ID after the task."""
    token = getattr(task.request, "correlation_id_token", None)
    if token is not None:
        reset_correlation_id(token)
