"""Shared consumer idempotency."""

from __future__ import annotations

import logging
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

DEFAULT_TTL = 86_400  # 24h


class Deduper:
    """Namespace-scoped claim/release helper for consumer handlers."""

    def __init__(
        self,
        redis_client: aioredis.Redis,
        namespace: str = "ot:intel:dedupe",
        ttl_seconds: int = DEFAULT_TTL,
    ) -> None:
        self._redis = redis_client
        self._ns = namespace
        self._ttl = ttl_seconds

    async def claim(self, key: str) -> bool:
        """True = this consumer owns processing; False = already claimed."""
        full = f"{self._ns}:{key}"
        acquired = await self._redis.set(full, b"1", nx=True, ex=self._ttl)
        return bool(acquired)

    async def release(self, key: str) -> None:
        """Release after failure so redelivery reprocesses."""
        await self._redis.delete(f"{self._ns}:{key}")


__all__ = ["Deduper", "DEFAULT_TTL"]
