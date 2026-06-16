from celery import Celery  # type: ignore[import-untyped]

celery_app = Celery("traingrid")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
)
