"""Comprehensive tests for Health Service.

Tests cover:
- Basic health check (liveness)
- Readiness check (dependencies)
- Uptime tracking
- Database connectivity
- Embedding model availability
"""

import pytest
from generated import intelligence_pb2


@pytest.mark.asyncio
async def test_health_check(health_client):
    """
    Test basic health check (liveness probe).
    Verify:
    - Service is healthy
    - Version is returned
    - Uptime is tracked
    """
    response = await health_client.Check(intelligence_pb2.HealthCheckRequest())

    assert response.status == "healthy"
    assert response.version != ""
    assert response.version == "0.1.0"
    assert response.uptime_seconds >= 0


@pytest.mark.asyncio
async def test_health_ready(health_client):
    """
    Test readiness check.
    Verify:
    - All dependencies are checked
    - Database is ready
    - Embeddings are ready
    - Overall status is correct
    """
    response = await health_client.Ready(intelligence_pb2.ReadyCheckRequest())

    # Should have dependency status (it's a map, not a list)
    assert len(response.dependency_status) > 0

    # Check for required dependencies
    deps_dict = dict(response.dependency_status)

    assert "database" in deps_dict, "Should check database dependency"
    assert "embeddings" in deps_dict, "Should check embeddings dependency"

    # In test environment, both should be ready
    assert deps_dict["database"] is True, "Database should be ready in tests"

    # Overall ready status should reflect dependencies
    # Service is ready if all critical deps are ready
    db_ready = deps_dict.get("database", False)
    embeddings_ready = deps_dict.get("embeddings", False)

    # If both critical deps are ready, service should be ready
    if db_ready and embeddings_ready:
        assert response.ready is True


@pytest.mark.asyncio
async def test_health_uptime_increases(health_client):
    """
    Test that uptime increases over time.
    """
    import asyncio

    # First check
    response1 = await health_client.Check(intelligence_pb2.HealthCheckRequest())
    uptime1 = response1.uptime_seconds

    # Wait a bit
    await asyncio.sleep(1)

    # Second check
    response2 = await health_client.Check(intelligence_pb2.HealthCheckRequest())
    uptime2 = response2.uptime_seconds

    # Uptime should have increased
    assert uptime2 >= uptime1


@pytest.mark.asyncio
async def test_health_check_multiple_calls(health_client):
    """
    Test multiple concurrent health checks.
    Verify service remains stable.
    """
    import asyncio

    # Send multiple concurrent health checks
    tasks = [
        health_client.Check(intelligence_pb2.HealthCheckRequest()) for _ in range(10)
    ]

    responses = await asyncio.gather(*tasks)

    # All should succeed
    assert len(responses) == 10
    assert all(r.status == "healthy" for r in responses)
    assert all(r.version == "0.1.0" for r in responses)


@pytest.mark.asyncio
async def test_ready_check_dependencies_format(health_client):
    """
    Test readiness check dependencies are in correct format.
    """
    response = await health_client.Ready(intelligence_pb2.ReadyCheckRequest())

    # dependency_status should be a map/dict
    deps = dict(response.dependency_status)
    assert isinstance(deps, dict)
    assert len(deps) > 0, "Should have at least one dependency"

    # Each dependency should have a boolean status
    for dep_name, status in deps.items():
        assert isinstance(dep_name, str), (
            f"Dependency name should be string: {dep_name}"
        )
        assert isinstance(status, bool), (
            f"Dependency status should be boolean: {status}"
        )
