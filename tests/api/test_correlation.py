import json
import logging
import uuid
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.api.core.logging import (
    CorrelationIdFilter,
    JsonFormatter,
)
from backend.api.main import app
from backend.api.middleware.correlation import (
    CORRELATION_ID_HEADER,
    CorrelationIdMiddleware,
)
from backend.shared.context import (
    get_correlation_id,
    reset_correlation_id,
    set_correlation_id,
)
from backend.workers.celery_app import bind_correlation_id, unbind_correlation_id

client = TestClient(app)


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def test_middleware_generates_id_when_missing():
    response = client.get("/health")

    assert response.status_code == 200
    correlation_id = response.headers[CORRELATION_ID_HEADER]
    assert _is_uuid(correlation_id)


def test_middleware_echoes_client_supplied_id():
    response = client.get("/health", headers={CORRELATION_ID_HEADER: "req-123"})

    assert response.status_code == 200
    assert response.headers[CORRELATION_ID_HEADER] == "req-123"


def test_middleware_generates_id_when_blank():
    response = client.get("/health", headers={CORRELATION_ID_HEADER: "   "})

    assert response.status_code == 200
    assert _is_uuid(response.headers[CORRELATION_ID_HEADER])


def test_middleware_resets_context_after_request():
    client.get("/health", headers={CORRELATION_ID_HEADER: "req-123"})

    assert get_correlation_id() is None


def test_correlation_id_filter_injects_id():
    token = set_correlation_id("req-123")
    try:
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="hello",
            args=(),
            exc_info=None,
        )
        assert CorrelationIdFilter().filter(record) is True
        assert record.correlation_id == "req-123"
    finally:
        reset_correlation_id(token)


def test_correlation_id_filter_defaults_when_unset():
    assert get_correlation_id() is None
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hello",
        args=(),
        exc_info=None,
    )
    CorrelationIdFilter().filter(record)

    assert record.correlation_id == "-"


def test_json_formatter_includes_correlation_id():
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hello",
        args=(),
        exc_info=None,
    )
    record.correlation_id = "req-123"

    payload = json.loads(JsonFormatter().format(record))

    assert payload["level"] == "INFO"
    assert payload["msg"] == "hello"
    assert payload["correlation_id"] == "req-123"


def test_create_run_propagates_correlation_id_to_task_headers():
    payload = {
        "experiment_id": 1,
        "project_id": 1,
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
        },
    }
    with patch(
        "backend.workers.tasks.training_tasks.start_training_run.apply_async"
    ) as mock_apply:
        response = client.post(
            "/runs/", json=payload, headers={CORRELATION_ID_HEADER: "req-123"}
        )
        assert response.status_code == 200
        assert response.headers[CORRELATION_ID_HEADER] == "req-123"
        mock_apply.assert_called_once()
        assert mock_apply.call_args.kwargs["headers"] == {
            CORRELATION_ID_HEADER: "req-123"
        }


def _fake_task(headers):
    return SimpleNamespace(
        request=SimpleNamespace(headers=headers, correlation_id_token=None)
    )


def test_worker_prerun_binds_id_from_headers():
    assert get_correlation_id() is None
    task = _fake_task({CORRELATION_ID_HEADER: "req-123"})
    try:
        bind_correlation_id(task)
        assert get_correlation_id() == "req-123"
    finally:
        unbind_correlation_id(task)

    assert get_correlation_id() is None


def test_worker_prerun_handles_missing_id():
    task = _fake_task({})
    try:
        bind_correlation_id(task)
        assert get_correlation_id() is None
    finally:
        unbind_correlation_id(task)

    assert get_correlation_id() is None


def test_middleware_is_registered_on_app():
    middlewares = [m.cls for m in app.user_middleware]
    assert CorrelationIdMiddleware in middlewares
