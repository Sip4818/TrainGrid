"""Middleware that binds a correlation ID to every request.

Reads X-Correlation-ID from the incoming request (or generates one when
absent), stores it in the request-scoped ContextVar for the duration of
the request, and echoes it back in the response header so callers —
including the frontend — can reference it in error reports.
"""

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from backend.shared.context import reset_correlation_id, set_correlation_id

CORRELATION_ID_HEADER = "X-Correlation-ID"


def _resolve_correlation_id(request: Request) -> str:
    """Return the client-supplied ID, or a fresh UUID when missing/blank."""
    candidate = request.headers.get(CORRELATION_ID_HEADER)
    if candidate and candidate.strip():
        return candidate.strip()
    return str(uuid.uuid4())


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        correlation_id = _resolve_correlation_id(request)
        token = set_correlation_id(correlation_id)
        try:
            response = await call_next(request)
        finally:
            reset_correlation_id(token)
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response
