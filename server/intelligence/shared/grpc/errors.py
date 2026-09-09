"""Unified gRPC exception classification."""

import grpc


def classify_grpc_error(error: Exception) -> grpc.StatusCode:
    """Classify an exception to the appropriate gRPC status code.

    Enables proper client-side error handling and retry logic.
    """
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()

    if "not found" in error_str or "does not exist" in error_str:
        return grpc.StatusCode.NOT_FOUND
    if (
        "permission" in error_str
        or "unauthorized" in error_str
        or "access denied" in error_str
    ):
        return grpc.StatusCode.PERMISSION_DENIED
    if (
        "invalid" in error_str
        or "validation" in error_str
        or "valueerror" in error_type
    ):
        return grpc.StatusCode.INVALID_ARGUMENT
    if "timeout" in error_str or "deadline" in error_str:
        return grpc.StatusCode.DEADLINE_EXCEEDED
    if "rate" in error_str or "quota" in error_str or "exhausted" in error_str:
        return grpc.StatusCode.RESOURCE_EXHAUSTED
    if "already exists" in error_str or "duplicate" in error_str:
        return grpc.StatusCode.ALREADY_EXISTS
    if "unavailable" in error_str or "connection" in error_str:
        return grpc.StatusCode.UNAVAILABLE
    return grpc.StatusCode.INTERNAL
