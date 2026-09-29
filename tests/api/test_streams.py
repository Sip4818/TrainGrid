"""Integration tests for the SSE run-stream endpoint (#89, Layer 3).

The Redis subscription is faked at the ``stream_run_events`` boundary, so
no live Redis is needed: tests assert framing, initial state, passthrough,
and clean termination on terminal events.
"""

import json
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from backend.api import routers
from backend.api.main import app

client = TestClient(app)

# The subscription layer is patched out; the endpoint only forwards this
# object, so a dummy is enough.
app.state.redis = MagicMock()


def _fake_stream(events, seen):
    async def gen():
        for event in events:
            yield event

    def factory(client, run_id):
        seen["run_id"] = run_id
        return gen()

    return factory


def _streamed_events(response):
    return [
        json.loads(line[len("data: ") :])
        for line in response.text.splitlines()
        if line.startswith("data:")
    ]


def _create_pending_run():
    payload = {
        "experiment_id": 1,
        "project_id": 1,
        "trainer_name": "random_forest",
        "config": {
            "dataset_path": "dummy.csv",
            "target_column": "target",
            "feature_columns": ["f1", "f2"],
            "n_estimators": 5,
        },
    }
    with patch("backend.workers.tasks.training_tasks.start_training_run.apply_async"):
        response = client.post("/runs/", json=payload)
        assert response.status_code == 200
        return response.json()["id"]


def test_stream_missing_run_returns_404():
    response = client.get("/runs/999999/stream?project_id=1&experiment_id=1")

    assert response.status_code == 404


def test_stream_sends_initial_state_then_terminates():
    run_id = _create_pending_run()
    seen = {}
    terminal = {"type": "status", "status": "completed", "metrics": {"accuracy": 1.0}}

    with patch.object(
        routers.streams,
        "stream_run_events",
        new=_fake_stream([terminal], seen),
    ):
        response = client.get(f"/runs/{run_id}/stream?project_id=1&experiment_id=1")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    assert seen["run_id"] == run_id
    events = _streamed_events(response)
    assert events[0] == {"type": "status", "status": "pending", "metrics": {}}
    assert events[-1] == terminal


def test_stream_passes_epoch_events_through():
    run_id = _create_pending_run()
    seen = {}
    live = [
        {"type": "epoch", "epoch": 1, "total_epochs": 2, "loss": 0.5},
        {"type": "epoch", "epoch": 2, "total_epochs": 2, "loss": 0.4},
        {"type": "status", "status": "completed", "metrics": {}},
    ]

    with patch.object(
        routers.streams,
        "stream_run_events",
        new=_fake_stream(live, seen),
    ):
        response = client.get(f"/runs/{run_id}/stream?project_id=1&experiment_id=1")

    assert response.status_code == 200
    events = _streamed_events(response)
    assert events[1:] == live
