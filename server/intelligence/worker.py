"""Standalone worker runtime.

Runs durable background consumers for the Redis Streams backbone, separate
from the gRPC server so they scale and fail independently. Includes consumers
for ingestion, metering, and memory extraction.

Usage:
    WORKER_ROLE=all|heartbeat uv run worker.py
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timezone

from core.events import EventEnvelope, Streams
from core.logging import setup_logging
from shared.redis import ConsumerSpec, EventBus, WorkerRuntime, build_redis
from features.billing import handle_chat_completed as _metering_handler
from features.knowledge.worker import handle_ingestion_job, sweep_stuck_jobs
from features.chat.memory import handle_memory_extraction

logger = logging.getLogger(__name__)

HEARTBEAT_STREAM = Streams.HEARTBEAT


async def handle_heartbeat(envelope: EventEnvelope, msg_id: str) -> None:
    """Heartbeat handler: log and acknowledge."""
    logger.info(
        "heartbeat processed",
        extra={
            "msg_id": msg_id,
            "event_type": envelope.event_type,
            "correlation_id": envelope.correlation_id,
        },
    )


def build_runtime(role: str) -> WorkerRuntime:
    runtime = WorkerRuntime()
    if role in ("all", "heartbeat"):
        runtime.add(
            ConsumerSpec(
                stream=HEARTBEAT_STREAM,
                group="workers",
                handler=handle_heartbeat,
                consumer_name=f"heartbeat-{os.getpid()}",
            )
        )
    if role in ("all", "ingestion"):
        runtime.add(
            ConsumerSpec(
                stream=Streams.INGESTION_JOBS,
                group="workers",
                handler=handle_ingestion_job,
                consumer_name=f"ingestion-{os.getpid()}",
            )
        )
    if role in ("all", "metering"):
        runtime.add(
            ConsumerSpec(
                stream=Streams.CHAT_EVENTS,
                group="metering",
                handler=_metering_handler,
                consumer_name=f"metering-{os.getpid()}",
            )
        )
    if role in ("all", "memory"):
        runtime.add(
            ConsumerSpec(
                stream=Streams.CHAT_EVENTS,
                group="memory",
                handler=handle_memory_extraction,
                consumer_name=f"memory-{os.getpid()}",
            )
        )
    return runtime


async def main() -> int:
    setup_logging()
    role = os.environ.get("WORKER_ROLE", "all")
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    client = await build_redis(redis_url)
    bus = EventBus(client)
    runtime = build_runtime(role)

    if not runtime.specs:
        logger.error("no consumers registered for WORKER_ROLE=%s", role)
        return 2

    # Startup sweep: re-enqueue ingestion jobs orphaned by a crashed worker.
    # Failures here must not block the runtime.
    try:
        recovered = await sweep_stuck_jobs(bus)
        if recovered:
            logger.warning("startup sweep re-enqueued %d stuck jobs", recovered)
    except Exception:  # noqa: BLE001
        logger.exception("startup sweep failed; continuing without it")

    # Periodic sweep: recover jobs stranded after the boot sweep.
    async def periodic_sweep() -> None:
        while True:
            await asyncio.sleep(300)  # every 5 minutes
            try:
                recovered = await sweep_stuck_jobs(bus)
                if recovered:
                    logger.warning(
                        "periodic sweep re-enqueued %d stuck jobs", recovered
                    )
            except Exception:  # noqa: BLE001 - keep looping
                logger.exception("periodic sweep failed")

    # Stream depth metrics (R3.4/R7): lag + DLQ depth per known stream.
    async def stream_metrics() -> None:

        while True:
            await asyncio.sleep(60)
            try:
                for name in (
                    HEARTBEAT_STREAM,
                    Streams.INGESTION_JOBS,
                    Streams.CHAT_EVENTS,
                ):
                    try:
                        info = await client.xinfo_stream(name)
                        length = info.get(b"length", 0)
                        if isinstance(length, bytes):
                            length = int(length)
                        pending = await client.xpending(name, "workers")
                        p = (
                            pending.get("pending")
                            if isinstance(pending, dict)
                            else 0
                        )
                        dlq_len = await client.xlen(Streams.dlq(name))
                        logger.info(
                            "stream_metrics",
                            extra={
                                "stream": name,
                                "length": int(length),
                                "pending": p,
                                "dlq_depth": dlq_len,
                            },
                        )
                    except Exception:  # noqa: BLE001 - stream may not exist yet
                        pass
            except Exception:  # noqa: BLE001 - keep looping
                logger.exception("stream metrics failed")

    sweep_task = asyncio.create_task(periodic_sweep())
    metrics_task = asyncio.create_task(stream_metrics())

    # Publish a startup heartbeat so operators see a live round trip.
    await bus.publish(
        HEARTBEAT_STREAM,
        EventEnvelope.create(
            "ops.worker.started.v1",
            f"worker-{os.getpid()}",
            {"role": role, "started_at": datetime.now(timezone.utc).isoformat()},
        ),
    )

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:  # pragma: no cover - Windows dev
            pass

    runner = asyncio.create_task(runtime.run_forever(client))
    stopper = asyncio.create_task(stop.wait())
    done, _pending = await asyncio.wait(
        {runner, stopper}, return_when=asyncio.FIRST_COMPLETED
    )
    if stopper in done:
        logger.info("shutdown signal received; cancelling consumers")
        sweep_task.cancel()
        metrics_task.cancel()
        runner.cancel()
        try:
            await runner
        except asyncio.CancelledError:
            pass
        return 0
    if runner in done:
        exc = runner.exception()
        logger.error("worker runtime exited unexpectedly: %s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
