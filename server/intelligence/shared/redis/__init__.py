"""Redis infrastructure module."""

from shared.redis.client import build_redis
from shared.redis.bus import (
    DEFAULT_BATCH,
    DEFAULT_BLOCK_MS,
    DEFAULT_MAXLEN,
    RECLAIM_INTERVAL_S,
    RECLAIM_MIN_IDLE_MS,
    ConsumerGroupRunner,
    ConsumerSpec,
    EventBus,
    WorkerRuntime,
)
from shared.redis.dedupe import Deduper

__all__ = [
    "build_redis",
    "ConsumerGroupRunner",
    "ConsumerSpec",
    "EventBus",
    "WorkerRuntime",
    "DEFAULT_MAXLEN",
    "DEFAULT_BLOCK_MS",
    "DEFAULT_BATCH",
    "RECLAIM_MIN_IDLE_MS",
    "RECLAIM_INTERVAL_S",
    "Deduper",
]
