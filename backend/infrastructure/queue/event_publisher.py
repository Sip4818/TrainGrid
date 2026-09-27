"""Best-effort Redis Pub/Sub publishing for live training events.

Channel convention: ``training:runs:{run_id}:events`` — one channel per run
so subscribers (e.g. the SSE endpoint) listen narrowly and different runs'
events can never interleave.

Publishing is intentionally fire-and-forget: if Redis is unreachable the
event is dropped with a warning and training continues. A streaming outage
must never fail a training run.
"""

import json

import redis

from backend.api.core.config import settings
from backend.api.core.logging import get_logger
from backend.trainers.base import TrainingEvent

logger = get_logger(__name__)

TRAINING_EVENTS_CHANNEL = "training:runs:{run_id}:events"

_client: redis.Redis | None = None


def get_client() -> redis.Redis:
    """Return the shared sync Redis client, creating it on first use."""
    global _client
    if _client is None:
        _client = redis.Redis.from_url(settings.redis_url)
    return _client


def publish_training_event(run_id: str, event: TrainingEvent) -> None:
    """Publish ``event`` to this run's channel. Never raises."""
    try:
        get_client().publish(
            TRAINING_EVENTS_CHANNEL.format(run_id=run_id), json.dumps(event)
        )
    except redis.RedisError:
        logger.warning(
            "Dropping training event for run_id=%s: redis unreachable", run_id
        )
