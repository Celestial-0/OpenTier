"""Redis Streams event backbone.

Implements the transport for the envelope types in :mod:`core.events`:
publishing with ``MAXLEN`` caps, consumer groups with manual ``XACK``, retry
counting, dead-letter routing, and an ``XAUTOCLAIM`` janitor that recovers
entries abandoned by crashed consumers.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Awaitable, Callable


import redis.asyncio as aioredis

from core.events import EventEnvelope, Streams

logger = logging.getLogger(__name__)

DEFAULT_MAXLEN = 10_000
DEFAULT_BLOCK_MS = 5_000
DEFAULT_BATCH = 16
RECLAIM_MIN_IDLE_MS = 30_000
RECLAIM_INTERVAL_S = 30.0


class EventBus:
    """Producer side: append envelopes to streams with bounded length."""

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self._redis = redis_client

    async def publish(
        self,
        stream: str,
        envelope: EventEnvelope,
        maxlen: int = DEFAULT_MAXLEN,
    ) -> str:
        entry_id = await self._redis.xadd(
            stream,
            envelope.to_stream_fields(),  # type: ignore[arg-type]
            maxlen=maxlen,
            approximate=True,
        )
        logger.debug(
            "published event",
            extra={
                "stream": stream,
                "event_type": envelope.event_type,
                "event_id": envelope.event_id,
                "entry_id": entry_id,
            },
        )
        return entry_id  # type: ignore[return-value]


Handler = Callable[[EventEnvelope, str], Awaitable[None]]


@dataclass
class ConsumerSpec:
    """A single consumer group binding on one stream."""

    stream: str
    group: str
    handler: Handler
    consumer_name: str
    max_retries: int = 3
    block_ms: int = DEFAULT_BLOCK_MS
    batch_size: int = DEFAULT_BATCH
    start_id: str = "$"  # '$' for new-only, '0' to drain history


class ConsumerGroupRunner:
    """Consumes from a Redis Stream under a consumer group."""

    def __init__(self, redis_client: aioredis.Redis, spec: ConsumerSpec) -> None:
        self._redis = redis_client
        self.spec = spec
        self._running = False

    async def ensure_group(self) -> None:
        try:
            await self._redis.xgroup_create(
                self.spec.stream,
                self.spec.group,
                id=self.spec.start_id,
                mkstream=True,
            )
            logger.info(
                "created consumer group %s on %s",
                self.spec.group,
                self.spec.stream,
            )
        except aioredis.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def run_forever(self) -> None:
        await self.ensure_group()
        self._running = True
        logger.info(
            "consumer %s listening on %s/%s",
            self.spec.consumer_name,
            self.spec.stream,
            self.spec.group,
        )
        while self._running:
            try:
                await self._read_and_process()
            except asyncio.CancelledError:
                self._running = False
                raise
            except (TimeoutError, aioredis.TimeoutError):
                # Idle stream timeout during blocking read; loop and poll again
                continue
            except Exception:  # noqa: BLE001
                logger.exception("error in consumer loop for %s", self.spec.stream)
                await asyncio.sleep(1.0)

    async def _read_and_process(self) -> None:
        streams = await self._redis.xreadgroup(
            groupname=self.spec.group,
            consumername=self.spec.consumer_name,
            streams={self.spec.stream: ">"},
            count=self.spec.batch_size,
            block=self.spec.block_ms,
        )
        if not streams:
            return
        for _, messages in streams:  # type: ignore[misc,union-attr]
            for msg_id, fields in messages:  # type: ignore[misc,union-attr]
                await self._handle_message(msg_id, fields)


    async def _handle_message(self, msg_id: bytes | str, fields: dict) -> None:
        msg_id_str = msg_id.decode() if isinstance(msg_id, bytes) else str(msg_id)
        try:
            envelope = EventEnvelope.from_stream_fields(fields)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "corrupt envelope in %s at %s: %s",
                self.spec.stream,
                msg_id_str,
                exc,
            )
            await self._to_dlq(msg_id_str, fields, f"corrupt: {exc}")
            await self._ack(msg_id)
            return

        try:
            await self.spec.handler(envelope, msg_id_str)
            await self._ack(msg_id)
            await self._clear_retries(msg_id_str)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "handler failed for %s on %s: %s",
                msg_id_str,
                self.spec.stream,
                exc,
            )
            attempts = await self._inc_retries(msg_id_str)
            if attempts >= self.spec.max_retries:
                logger.error(
                    "message %s on %s moved to DLQ after %d attempts",
                    msg_id_str,
                    self.spec.stream,
                    attempts,
                )
                await self._to_dlq(msg_id_str, fields, str(exc))
                await self._ack(msg_id)
                await self._clear_retries(msg_id_str)

    def _retry_key(self, msg_id_str: str) -> str:
        return f"ot:intel:retries:{self.spec.stream}:{self.spec.group}:{msg_id_str}"

    async def _inc_retries(self, msg_id_str: str) -> int:
        key = self._retry_key(msg_id_str)
        val = await self._redis.incr(key)
        await self._redis.expire(key, 86400)
        return int(val)

    async def _clear_retries(self, msg_id_str: str) -> None:
        await self._redis.delete(self._retry_key(msg_id_str))

    async def _ack(self, msg_id: bytes | str) -> None:
        await self._redis.xack(self.spec.stream, self.spec.group, msg_id)

    async def _to_dlq(self, msg_id_str: str, fields: dict, error: str) -> None:
        dlq_stream = Streams.dlq(self.spec.stream)
        payload = {
            k.decode() if isinstance(k, bytes) else k: (
                v.decode() if isinstance(v, bytes) else v
            )
            for k, v in fields.items()
        }
        payload["dlq_source"] = self.spec.stream
        payload["dlq_source_id"] = msg_id_str
        payload["dlq_source_stream"] = self.spec.stream
        payload["dlq_error"] = error
        await self._redis.xadd(dlq_stream, payload, maxlen=DEFAULT_MAXLEN)

    async def janitor_forever(
        self,
        min_idle_ms: int = RECLAIM_MIN_IDLE_MS,
        interval_s: float = RECLAIM_INTERVAL_S,
    ) -> None:
        """P1.H4: claim PEL entries older than min_idle_ms via XAUTOCLAIM."""
        await self.ensure_group()
        start_id = "0-0"
        while self._running:
            try:
                await asyncio.sleep(interval_s)
                res = await self._redis.xautoclaim(
                    self.spec.stream,
                    self.spec.group,
                    self.spec.consumer_name,
                    min_idle_time=min_idle_ms,
                    start_id=start_id,
                    count=self.spec.batch_size,
                )
                if not res:
                    continue
                start_id, messages = res[0], res[1]
                claimed = len(messages or [])
                if claimed:
                    logger.info("janitor reclaimed %d orphaned entries", len(messages))
                for msg_id, fields in messages or []:
                    await self._handle_message(msg_id, fields)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                logger.exception("janitor loop error")


@dataclass
class WorkerRuntime:
    """Bundle of consumers run by a worker process."""

    specs: list[ConsumerSpec] = field(default_factory=list)

    def add(self, spec: ConsumerSpec) -> None:
        self.specs.append(spec)

    async def run_forever(self, redis_client: aioredis.Redis) -> None:
        runners = [
            ConsumerGroupRunner(redis_client, spec) for spec in self.specs
        ]
        tasks: list[asyncio.Task[None]] = []
        for runner in runners:
            tasks.append(asyncio.create_task(runner.run_forever()))
            tasks.append(asyncio.create_task(runner.janitor_forever()))
        logger.info("worker runtime started (%d consumers)", len(runners))
        await asyncio.gather(*tasks)
