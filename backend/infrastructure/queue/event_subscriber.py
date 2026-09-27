"""Async Redis Pub/Sub subscription for live training events.

Companion to ``event_publisher``: the publisher (sync, worker side) drops
events into ``training:runs:{run_id}:events``; this module (async, API side)
listens on that channel and yields decoded payloads. Keeping the subscriber
here — next to the publisher and the channel constant — means the channel
convention lives in exactly one layer.

The shared client is created with ``decode_responses=True`` (see the
lifespan handler in ``backend.api.main``), so message payloads arrive as
``str`` and only need ``json.loads`` here.
"""

import json
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as redis_asyncio

from backend.infrastructure.queue.event_publisher import TRAINING_EVENTS_CHANNEL


async def stream_run_events(
    client: redis_asyncio.Redis, run_id: int
) -> AsyncIterator[dict[str, Any]]:
    """Yield decoded event dicts from this run's channel until cancelled.

    The caller's ``async for`` drives the subscription; breaking out of the
    loop (terminal event, disconnect, timeout) cancels this generator, and
    the ``finally`` block releases the subscription either way.
    """
    pubsub = client.pubsub()
    await pubsub.subscribe(TRAINING_EVENTS_CHANNEL.format(run_id=run_id))
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            yield json.loads(message["data"])
    finally:
        await pubsub.unsubscribe(TRAINING_EVENTS_CHANNEL.format(run_id=run_id))
        await pubsub.aclose()
