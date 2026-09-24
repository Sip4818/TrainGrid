"""Tests for Prometheus telemetry: /metrics endpoint and HTTP middleware.

The global ``REGISTRY`` is shared across the whole test session (there is no
per-test isolation), so every assertion here is a before/after delta — never
an absolute value.
"""

from unittest.mock import patch

from fastapi.testclient import TestClient
from prometheus_client import REGISTRY

from backend.api.main import app

client = TestClient(app)


def _sample_value(name: str, labels: dict[str, str]) -> float:
    """Read a sample from the global registry, defaulting to 0 when absent."""
    return REGISTRY.get_sample_value(name, labels) or 0.0


def test_metrics_endpoint_returns_exposition_format() -> None:
    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "http_requests_total" in response.text
    assert "traingrid_runs_created_total" in response.text


def test_middleware_records_template_labels() -> None:
    labels = {"method": "GET", "path_template": "/health", "status_code": "200"}
    before_count = _sample_value("http_requests_total", labels)
    before_hist = _sample_value("http_request_duration_seconds_count", labels)

    response = client.get("/health")

    assert response.status_code == 200
    assert _sample_value("http_requests_total", labels) == before_count + 1
    assert _sample_value("http_request_duration_seconds_count", labels) == (
        before_hist + 1
    )


def test_middleware_labels_unmatched_path() -> None:
    labels = {
        "method": "GET",
        "path_template": "unmatched",
        "status_code": "404",
    }
    before = _sample_value("http_requests_total", labels)

    response = client.get("/no-such-route-should-404")

    assert response.status_code == 404
    assert _sample_value("http_requests_total", labels) == before + 1


def test_runs_created_counter_increments() -> None:
    labels = {"trainer_name": "random_forest"}
    before = _sample_value("traingrid_runs_created_total", labels)
    payload = {
        "experiment_id": 1,
        "project_id": 1,
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
            "n_estimators": 10,
        },
    }
    with patch(
        "backend.workers.tasks.training_tasks.start_training_run.apply_async"
    ):
        response = client.post("/runs/", json=payload)

    assert response.status_code == 200
    assert _sample_value("traingrid_runs_created_total", labels) == before + 1
