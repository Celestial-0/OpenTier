"""Unified gRPC context helpers: deadline validation and correlation tracking."""

import uuid
import grpc
from core.logging import get_logger

logger = get_logger(__name__)


def check_deadline(context: grpc.ServicerContext) -> bool:
    """Check if the request deadline has been exceeded."""
    time_remaining = context.time_remaining()
    if time_remaining is not None and time_remaining <= 0:
        logger.warning("Request deadline exceeded")
        return False
    return True


def get_correlation_id(context: grpc.ServicerContext) -> str:
    """Extract or generate a correlation ID for request tracing."""
    metadata = dict(context.invocation_metadata()) if context.invocation_metadata() else {}
    for key, val in metadata.items():
        if key.lower() in ("x-correlation-id", "x-request-id"):
            return str(val)
    return str(uuid.uuid4())
