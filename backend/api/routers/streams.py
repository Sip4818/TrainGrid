"""Server-Sent Events streaming for live training runs.

``GET /runs/{run_id}/stream`` bridges the Redis Pub/Sub channel (written by
the Celery worker, see Layer 2) to browsers, which cannot speak the Redis
protocol. Each yielded line follows the SSE framing (``data: {...}``).
"""

import asyncio
import json
import time
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.api.core.logging import get_logger
from backend.api.services.run_service import RunService
from backend.infrastructure.database.session import get_db
from backend.infrastructure.queue.event_subscriber import stream_run_events
from backend.shared.enums import RunStatus

logger = get_logger(__name__)

router = APIRouter(prefix="/runs", tags=["streams"])

# Idle gaps longer than this emit a heartbeat comment so proxies do not
# close the stream; a fully quiet stream ends after the idle timeout.
HEARTBEAT_INTERVAL_SECONDS = 15.0
STREAM_IDLE_TIMEOUT_SECONDS = 30 * 60

TERMINAL_STATUSES = frozenset(
    {RunStatus.COMPLETED.value, RunStatus.FAILED.value, RunStatus.CANCELLED.value}
)


def _status_value(status: Any) -> str:
    if isinstance(status, RunStatus):
        return status.value
    return str(status)


def _format_event(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.get("/{run_id}/stream")
async def stream_run(
    run_id: int,
    request: Request,
    project_id: int = Query(..., description="Project owning the run"),
    experiment_id: int = Query(..., description="Experiment owning the run"),
    db: Session = Depends(get_db),  # noqa: B008
) -> StreamingResponse:
    """Stream live training events for a run as Server-Sent Events."""
    run = RunService(db).get_run(run_id, experiment_id, project_id)

    initial_event = {
        "type": "status",
        "status": _status_value(run.status),
        "metrics": dict(run.metrics or {}),
    }

    async def event_generator():
        yield _format_event(initial_event)
        last_activity = time.monotonic()
        events = stream_run_events(request.app.state.redis, run_id)
        try:
            while True:
                if await request.is_disconnected():
                    logger.info("SSE client disconnected run_id=%d", run_id)
                    break
                try:
                    event = await asyncio.wait_for(
                        events.__anext__(), timeout=HEARTBEAT_INTERVAL_SECONDS
                    )
                except StopAsyncIteration:
                    break
                except (asyncio.TimeoutError, TimeoutError):
                    if time.monotonic() - last_activity > STREAM_IDLE_TIMEOUT_SECONDS:
                        logger.info("SSE stream idle timeout run_id=%d", run_id)
                        break
                    yield ": ping\n\n"
                    continue
                yield _format_event(event)
                last_activity = time.monotonic()
                if (
                    event.get("type") == "status"
                    and event.get("status") in TERMINAL_STATUSES
                ):
                    break
        finally:
            await events.aclose()

    logger.info("SSE stream opened run_id=%d", run_id)
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
