"""Central Prometheus metric definitions for TrainGrid.

All metric objects are module-level singletons defined here and imported
at the instrumentation call sites. Do not construct Counter/Histogram/Gauge
anywhere else — central definitions keep names, labels, and buckets consistent.

Process model note: ``prometheus_client`` metrics live in process memory.
The API and the Celery worker are separate processes, so each exposes its
own registry: the API serves ``/metrics`` on port 8000 (see
``backend/api/main.py``) and the worker serves ``start_http_server`` metrics
on the ``TRAINGRID_WORKER_METRICS_PORT`` port (see
``backend/workers/celery_app.py``). A Prometheus server scrapes both targets
and aggregates with ``sum()`` at query time.
"""

from prometheus_client import Counter, Gauge, Histogram

# --- HTTP request telemetry (recorded by MetricsMiddleware) ---

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "API request latency in seconds.",
    ["method", "path_template", "status_code"],
)

http_requests_total = Counter(
    "http_requests_total",
    "Total number of API requests.",
    ["method", "path_template", "status_code"],
)

# --- Training-run lifecycle (API + worker) ---

traingrid_runs_created_total = Counter(
    "traingrid_runs_created_total",
    "Training runs created.",
    ["trainer_name"],
)

traingrid_runs_status_transitions_total = Counter(
    "traingrid_runs_status_transitions_total",
    "Training run status transitions.",
    ["from_status", "to_status"],
)

traingrid_training_duration_seconds = Histogram(
    "traingrid_training_duration_seconds",
    "Wall-clock training time in seconds.",
    ["trainer_name", "status"],
)

traingrid_active_runs = Gauge(
    "traingrid_active_runs",
    "Training runs currently in RUNNING status.",
)

# --- Celery task telemetry (recorded via task signals) ---

traingrid_celery_task_duration_seconds = Histogram(
    "traingrid_celery_task_duration_seconds",
    "Celery task wall-clock duration in seconds.",
    ["task_name"],
)

# --- Inference telemetry (recorded by DeploymentService) ---

traingrid_inference_requests_total = Counter(
    "traingrid_inference_requests_total",
    "Prediction requests served.",
    ["model_name"],
)

traingrid_inference_duration_seconds = Histogram(
    "traingrid_inference_duration_seconds",
    "Prediction latency in seconds.",
    ["model_name"],
)
