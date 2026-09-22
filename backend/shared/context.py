"""Request-scoped context shared by the API and worker processes.

Holds the current correlation ID in a ContextVar so concurrent requests
in the same process never see each other's IDs. The value crosses the
API -> Celery process boundary via task headers (see run_service and
celery_app), not via shared memory — each process holds its own copy.
"""

from contextvars import ContextVar, Token

correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str | None:
    """Return the correlation ID for the current request/task, if any."""
    return correlation_id_var.get()


def set_correlation_id(correlation_id: str | None) -> Token[str | None]:
    """Bind a correlation ID to the current context; reset with the token."""
    return correlation_id_var.set(correlation_id)


def reset_correlation_id(token: Token[str | None]) -> None:
    """Restore the correlation ID that was active before the matching set."""
    correlation_id_var.reset(token)
