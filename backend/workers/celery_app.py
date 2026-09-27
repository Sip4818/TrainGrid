import os
import time

from celery import Celery  # type: ignore[import-untyped]
from celery.signals import task_postrun, task_prerun  # type: ignore[import-untyped]
from prometheus_client import start_http_server

from backend.api.core.config import settings
from backend.api.middleware.correlation import CORRELATION_ID_HEADER
from backend.infrastructure.tracking.metrics_store import (
    traingrid_celery_task_duration_seconds,
)
from backend.shared.context import reset_correlation_id, set_correlation_id
from backend.trainers.registration import register_all

celery_app = Celery("traingrid")

# Option D (issue #88): the worker serves its own Prometheus registry on a
# dedicated port because in-memory metrics can't cross the API/worker process
# boundary. Guarded by env var so importing this module in unit tests never
# binds a socket — docker-compose sets TRAINGRID_WORKER_METRICS_PORT=8001.
_metrics_port = os.getenv("TRAINGRID_WORKER_METRICS_PORT")
if _metrics_port:
    start_http_server(int(_metrics_port))

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


@task_prerun.connect
def record_task_start(task, **kwargs) -> None:  # type: ignore[no-untyped-def]
    """Stamp the task start time for duration telemetry."""
    task.request.metrics_start_time = time.perf_counter()


@task_postrun.connect
def record_task_duration(task, **kwargs) -> None:  # type: ignore[no-untyped-def]
    """Observe the task wall-clock duration in Prometheus."""
    started = getattr(task.request, "metrics_start_time", None)
    if started is not None:
        traingrid_celery_task_duration_seconds.labels(task.name).observe(
            time.perf_counter() - started
        )
