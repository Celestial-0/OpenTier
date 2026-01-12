import logging
import time

from generated import intelligence_pb2
from generated import intelligence_pb2_grpc
from core.database import health_check as db_health_check

logger = logging.getLogger(__name__)

# Track service start time
_start_time = time.time()


class HealthService(intelligence_pb2_grpc.HealthServicer):
    """Health service for system health and readiness checks."""

    async def Check(self, request, context):
        """Basic health check (liveness probe)."""
        uptime = int(time.time() - _start_time)

        return intelligence_pb2.HealthCheckResponse(
            status="healthy",
            version="0.1.0",
            uptime_seconds=uptime,
        )

    async def Ready(self, request, context):
        """Readiness check (can accept requests)."""
        # Check database connectivity
        db_ready = await db_health_check()

        # Check embedding model is available
        embeddings_ready = False
        try:
            from core.config import get_config
            from engine.embedding import generate_query_embedding

            config = get_config()
            # Try a quick embedding generation to verify model is loaded
            test_embedding = await generate_query_embedding("health check")
            embeddings_ready = test_embedding is not None and len(test_embedding) > 0
        except Exception as e:
            logger.warning(f"Embedding check failed: {e}")
            embeddings_ready = False

        dependencies = ["database", "embeddings"]
        dependency_status = {
            "database": db_ready,
            "embeddings": embeddings_ready,
        }

        ready = all(dependency_status.values())

        if not ready:
            logger.warning(f"Service not ready. Dependencies: {dependency_status}")

        return intelligence_pb2.ReadyCheckResponse(
            ready=ready,
            dependencies=dependencies,
            dependency_status=dependency_status,
        )
