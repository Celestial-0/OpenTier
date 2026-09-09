"""gRPC servicer adapter for Health checks."""

from __future__ import annotations

import logging
from generated import intelligence_pb2, intelligence_pb2_grpc
from features.health.service import HealthServiceLogic

logger = logging.getLogger(__name__)


class HealthService(intelligence_pb2_grpc.HealthServicer):
    """Health service (liveness probe)."""

    def __init__(self, logic: HealthServiceLogic | None = None) -> None:
        self._logic = logic or HealthServiceLogic()

    async def Check(self, request, context):
        status = self._logic.get_status()
        return intelligence_pb2.HealthCheckResponse(
            status=status.status,
            version=status.version,
            uptime_seconds=status.uptime_seconds,
        )


__all__ = ["HealthService"]
