"""Structured logging configuration for the intelligence engine."""

import logging
import sys
from typing import Any


class StructuredFormatter(logging.Formatter):
    """Structured log formatter with consistent format."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with structured fields."""
        # Add custom fields
        if not hasattr(record, "service"):
            record.service = "intelligence"

        # Format message
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "service": record.service,
            "module": record.module,
            "function": record.funcName,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        # Format as key=value pairs
        parts = [f"{k}={v}" for k, v in log_data.items()]
        return " ".join(parts)


def setup_logging(level: str = "INFO") -> None:
    """
    Setup structured logging for the application.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Convert string level to logging constant
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    # Create formatter
    formatter = StructuredFormatter(datefmt="%Y-%m-%d %H:%M:%S")

    # Setup console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(numeric_level)

    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("asyncpg").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("grpc").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
