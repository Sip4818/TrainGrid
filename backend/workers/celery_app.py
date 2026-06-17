from celery import Celery  # type: ignore[import-untyped]

from backend.api.core.config import settings

celery_app = Celery("traingrid")

celery_app.conf.update(
    broker_url=settings.celery_broker_url,
    result_backend=settings.celery_result_backend,
    imports=["backend.workers.tasks.training_tasks"],
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
)
