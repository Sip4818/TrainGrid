from workers.celery_app import celery_app


@celery_app.task(name="training.start_run")
def start_training_run(run_id: str) -> dict[str, str]:
    return {"run_id": run_id, "status": "queued"}
