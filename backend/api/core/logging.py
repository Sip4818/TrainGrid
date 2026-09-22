import json
import logging
import sys

from backend.api.core.config import settings
from backend.shared.context import get_correlation_id

MISSING_CORRELATION_ID = "-"


class CorrelationIdFilter(logging.Filter):
    """Inject the current correlation ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id() or MISSING_CORRELATION_ID
        return True


class JsonFormatter(logging.Formatter):
    """Render log records as single-line JSON for machine consumption."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "location": f"{record.filename}:{record.lineno}",
            "msg": record.getMessage(),
            "correlation_id": getattr(
                record, "correlation_id", MISSING_CORRELATION_ID
            ),
        }
        return json.dumps(payload)


TEXT_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s"
    " | %(filename)s:%(lineno)d | [%(correlation_id)s] %(message)s"
)


def configure_logging() -> None:
    """Configure root logger with stdout handler and structured format.

    Uses human-readable text by default and single-line JSON when
    LOG_FORMAT=json, e.g. in production where logs are parsed by machines.
    """
    handler = logging.StreamHandler(sys.stdout)
    if settings.log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter(TEXT_FORMAT))
    handler.addFilter(CorrelationIdFilter())
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Avoid duplicate handlers if called multiple times
    if not root.handlers:
        root.addHandler(handler)
