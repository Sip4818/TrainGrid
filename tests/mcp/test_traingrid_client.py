"""Unit tests for the MCP TrainGrid API client.

Uses ``httpx.MockTransport`` so no network or API server is needed. Covers
every client method plus the error-code mapping the Inspector slice locks in
(``TRAINER_NOT_FOUND`` → 422, ``NOT_FOUND`` → 404,
``RUN_NOT_IN_EXPERIMENT`` → 422).
"""

import asyncio
import json

import httpx
import pytest
from traingrid_client import TrainGridAPIError, TrainGridClient

TRAINERS_PAYLOAD = [
    {"name": "random_forest", "label": "Random Forest", "config_schema": {}},
    {"name": "xgboost", "label": "XGBoost", "config_schema": {}},
]

RUN_PAYLOAD = {
    "experiment_id": 1,
    "project_id": 1,
    "config": {"trainer_name": "random_forest", "n_estimators": 10},
    "id": 7,
    "status": "pending",
    "metrics": {},
    "artifact_path": None,
}

COMPARISON_PAYLOAD = {
    "runs": [
        {
            "id": 7,
            "project_id": 1,
            "experiment_id": 1,
            "trainer_name": "random_forest",
            "status": "completed",
            "config": {},
            "metrics": {"accuracy": 0.9},
        }
    ],
    "metrics": ["accuracy"],
}


def _call(handler, coro):
    """Run a client coroutine against a mock transport (sync test process)."""

    async def _main():
        client = TrainGridClient(
            base_url="http://api:8000", transport=httpx.MockTransport(handler)
        )
        try:
            return await coro(client)
        finally:
            await client.aclose()

    return asyncio.run(_main())


def test_health():
    def handler(request):
        assert request.method == "GET"
        assert request.url.path == "/health"
        return httpx.Response(200, json={"status": "ok"})

    assert _call(handler, lambda c: c.health()) == {"status": "ok"}


def test_list_trainers():
    def handler(request):
        assert request.method == "GET"
        assert request.url.path == "/trainers/"
        return httpx.Response(200, json=TRAINERS_PAYLOAD)

    result = _call(handler, lambda c: c.list_trainers())
    assert [t["name"] for t in result] == ["random_forest", "xgboost"]


def test_create_run_posts_run_create_shape():
    seen = {}

    def handler(request):
        assert request.method == "POST"
        assert request.url.path == "/runs/"
        seen["body"] = json.loads(request.content.decode())
        return httpx.Response(200, json=RUN_PAYLOAD)

    config = {"n_estimators": 10}
    result = _call(handler, lambda c: c.create_run(1, 1, "random_forest", config))
    assert result["id"] == 7
    assert seen["body"] == {
        "project_id": 1,
        "experiment_id": 1,
        "trainer_name": "random_forest",
        "config": config,
    }


def test_get_run_unscoped_sends_no_params():
    def handler(request):
        assert request.url.path == "/runs/7"
        assert str(request.url) == "http://api:8000/runs/7"
        return httpx.Response(200, json=RUN_PAYLOAD)

    assert _call(handler, lambda c: c.get_run(7))["id"] == 7


def test_get_run_scoped_sends_both_ids():
    def handler(request):
        params = request.url.params
        assert (params["project_id"], params["experiment_id"]) == ("1", "1")
        return httpx.Response(200, json=RUN_PAYLOAD)

    assert _call(handler, lambda c: c.get_run(7, 1, 1))["status"] == "pending"


def test_list_runs_sends_scope():
    def handler(request):
        assert request.url.path == "/runs/"
        params = request.url.params
        assert (params["project_id"], params["experiment_id"]) == ("1", "1")
        return httpx.Response(200, json=[RUN_PAYLOAD])

    assert len(_call(handler, lambda c: c.list_runs(1, 1))) == 1


def test_compare_runs_repeats_run_ids():
    def handler(request):
        assert request.url.path == "/runs/compare"
        assert request.url.params.get_list("run_ids") == ["7", "8"]
        return httpx.Response(200, json=COMPARISON_PAYLOAD)

    result = _call(handler, lambda c: c.compare_runs(1, 1, [7, 8]))
    assert result["metrics"] == ["accuracy"]


def test_unknown_trainer_maps_code():
    def handler(request):
        return httpx.Response(
            422,
            json={
                "detail": {
                    "code": "TRAINER_NOT_FOUND",
                    "message": "Trainer 'nope' is not registered",
                }
            },
        )

    with pytest.raises(TrainGridAPIError) as exc_info:
        _call(handler, lambda c: c.create_run(1, 1, "nope", {}))
    assert exc_info.value.code == "TRAINER_NOT_FOUND"
    assert exc_info.value.status == 422
    assert "TRAINER_NOT_FOUND" in str(exc_info.value)


def test_unknown_run_maps_not_found():
    def handler(request):
        return httpx.Response(
            404,
            json={
                "detail": {
                    "code": "NOT_FOUND",
                    "message": "Training run with id '999' not found",
                }
            },
        )

    with pytest.raises(TrainGridAPIError) as exc_info:
        _call(handler, lambda c: c.get_run(999))
    assert exc_info.value.code == "NOT_FOUND"
    assert exc_info.value.status == 404


def test_cross_experiment_run_maps_code():
    def handler(request):
        return httpx.Response(
            422,
            json={
                "detail": {
                    "code": "RUN_NOT_IN_EXPERIMENT",
                    "message": "Run with id '7' not in experiment",
                }
            },
        )

    with pytest.raises(TrainGridAPIError) as exc_info:
        _call(handler, lambda c: c.get_run(7, 1, 99))
    assert exc_info.value.code == "RUN_NOT_IN_EXPERIMENT"
    assert exc_info.value.status == 422


def test_non_json_error_falls_back():
    def handler(request):
        return httpx.Response(500, text="proxy exploded")

    with pytest.raises(TrainGridAPIError) as exc_info:
        _call(handler, lambda c: c.list_runs(1, 1))
    assert exc_info.value.code == "API_ERROR"
    assert exc_info.value.status == 500
