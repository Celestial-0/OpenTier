"""Redis connection client factory."""

from __future__ import annotations

import os
import redis.asyncio as aioredis


async def build_redis(url: str | None = None) -> aioredis.Redis:
    """Build a configured asynchronous Redis client."""
    target_url = url or os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    return aioredis.from_url(
        target_url,
        decode_responses=False,
        health_check_interval=30,
        socket_keepalive=True,
    )
