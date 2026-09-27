"""Unit tests for the best-effort training event publisher (#89)."""

import json
from unittest.mock import MagicMock, patch

import redis

from backend.infrastructure.queue import event_publisher
from backend.infrastructure.queue.event_publisher import (
    TRAINING_EVENTS_CHANNEL,
    publish_training_event,
)


def test_channel_naming_convention():
    assert TRAINING_EVENTS_CHANNEL.format(run_id="7") == "training:runs:7:events"


def test_publish_sends_json_to_run_channel():
    client = MagicMock()
    with patch.object(event_publisher, "get_client", return_value=client):
        publish_training_event("7", {"type": "epoch", "epoch": 1})

    client.publish.assert_called_once_with(
        "training:runs:7:events", json.dumps({"type": "epoch", "epoch": 1})
    )


def test_publish_failure_is_swallowed():
    client = MagicMock()
    client.publish.side_effect = redis.ConnectionError("down")
    with patch.object(event_publisher, "get_client", return_value=client):
        # Must not raise: a Redis outage never fails a training run.
        publish_training_event("7", {"type": "epoch", "epoch": 1})

    client.publish.assert_called_once()
