"""Middleware that records Prometheus HTTP request telemetry.

Every request increments ``http_requests_total`` and observes
``http_request_duration_seconds``, labeled by method, route template, and
status code. Route templates (e.g. ``/runs/{run_id}``) are used instead of
raw paths so dynamic IDs don't explode label cardinality. The ``/metrics``
endpoint itself is excluded so scrapes don't record themselves.
"""

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from backend.infrastructure.tracking.metrics_store import (
    http_request_duration_seconds,
    http_requests_total,
)

METRICS_PATH = "/metrics"
UNMATCHED_ROUTE = "unmatched"


def _resolve_path_template(request: Request) -> str:
    """Return the matched route template, or a fallback for unmatched paths."""
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    if path:
        return str(path)
    return UNMATCHED_ROUTE


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path == METRICS_PATH:
            return await call_next(request)
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        labels = (
            request.method,
            _resolve_path_template(request),
            str(response.status_code),
        )
        http_requests_total.labels(*labels).inc()
        http_request_duration_seconds.labels(*labels).observe(elapsed)
        return response
