"""Health domain service: uptime and status tracking."""

from __future__ import annotations

import time
from dataclasses import dataclass

_START_TIME = time.time()


@dataclass(frozen=True)
class HealthStatus:
    status: str
    version: str
    uptime_seconds: int


class HealthServiceLogic:
    def __init__(self, version: str = "v1.1.0", start_time: float | None = None) -> None:
        self.version = version
        self.start_time = start_time or _START_TIME

    def get_status(self) -> HealthStatus:
        uptime = int(time.time() - self.start_time)
        return HealthStatus(
            status="healthy",
            version=self.version,
            uptime_seconds=uptime,
        )


__all__ = ["HealthStatus", "HealthServiceLogic"]
