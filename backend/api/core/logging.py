import logging
import sys


def configure_logging() -> None:
    """Configure root logger with stdout handler and structured format."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(filename)s:%(lineno)d | %(message)s"
        )
    )
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    # Avoid duplicate handlers if called multiple times
    if not root.handlers:
        root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a logger for the given name (typically __name__)."""
    return logging.getLogger(name)

