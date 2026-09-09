"""Health feature slice."""

from features.health.service import HealthStatus, HealthServiceLogic
from features.health.grpc_servicer import HealthService

__all__ = ["HealthStatus", "HealthServiceLogic", "HealthService"]
