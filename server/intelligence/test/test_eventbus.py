"""Event-bus tests: publish/consume/ack, retries → DLQ,
janitor reclaim of orphaned PEL entries.
"""

from __future__ import annotations

import asyncio
import os

import pytest
import pytest_asyncio
import redis.asyncio as aioredis

from core.events import EventEnvelope, EventTypes, Streams
from shared.redis import ConsumerGroupRunner, ConsumerSpec, EventBus


@pytest_asyncio.fixture(loop_scope="function")
async def redis_client():
    """Connect to real Redis via REDIS_URL (or default localhost)."""
    url = os.environ.get("REDIS_URL", "").strip() or "redis://localhost:6379/0"

    async def _sweep(client) -> None:
        try:
            await client.delete(
                Streams.CHAT_EVENTS,
                Streams.dlq(Streams.CHAT_EVENTS),
                f"ot:intel:retries:{Streams.CHAT_EVENTS}:workers",
            )
        except Exception:  # noqa: BLE001 - cleanup best-effort
            pass

    try:
        client = aioredis.from_url(url, decode_responses=False)
        await client.ping()
    except Exception as exc:
        pytest.skip(f"Redis not available at {url}: {exc}")

    await _sweep(client)  # heal leftovers from any prior crashed run
    yield client  # type: ignore[misc]
    await _sweep(client)
    await client.aclose()



async def make_runner(
    client: aioredis.Redis,
    handler,
    *,
    max_retries: int = 3,
    consumer: str = "test-consumer",
) -> ConsumerGroupRunner:
    spec = ConsumerSpec(
        stream=Streams.CHAT_EVENTS,
        group="workers",
        handler=handler,
        consumer_name=consumer,
        max_retries=max_retries,
        # Tests publish before the group exists; replay from stream start.
        start_id="0",
    )
    return ConsumerGroupRunner(client, spec)


async def test_publish_and_consume_ack(redis_client) -> None:
    received: list[EventEnvelope] = []

    async def handler(envelope: EventEnvelope, msg_id: str) -> None:
        received.append(envelope)

    bus = EventBus(redis_client)
    envelope = EventEnvelope.create(EventTypes.CHAT_COMPLETED, "corr-1", {"k": "v"})
    await bus.publish(Streams.CHAT_EVENTS, envelope)

    runner = await make_runner(redis_client, handler)
    # Single drain instead of infinite loop.
    await runner.ensure_group()
    await runner._read_and_process()  # noqa: SLF001 - test drives one tick

    assert len(received) == 1
    assert received[0].event_id == envelope.event_id
    assert received[0].payload == {"k": "v"}

    pending = await redis_client.xpending(Streams.CHAT_EVENTS, "workers")
    assert pending["pending"] == 0


async def test_failures_move_message_to_dlq_after_max_retries(redis_client) -> None:
    attempts = 0

    async def failing_handler(envelope: EventEnvelope, msg_id: str) -> None:
        nonlocal attempts
        attempts += 1
        raise RuntimeError("boom")

    bus = EventBus(redis_client)
    envelope = EventEnvelope.create(EventTypes.CHAT_COMPLETED, "corr-2", {})
    await bus.publish(Streams.CHAT_EVENTS, envelope)

    runner = await make_runner(redis_client, failing_handler, max_retries=2)
    await runner.ensure_group()

    # First delivery via the group read.
    await runner._read_and_process()  # noqa: SLF001
    # Redelivery of the unacked entry (as the janitor would do).
    entries = await redis_client.xrange(Streams.CHAT_EVENTS, "-", "+")
    assert entries
    msg_id, fields = entries[0]
    await runner._handle_message(msg_id, fields)  # noqa: SLF001

    assert attempts == 2
    dlq = Streams.dlq(Streams.CHAT_EVENTS)
    dlq_entries = await redis_client.xrange(dlq, "-", "+")
    assert len(dlq_entries) == 1
    fields_decoded = {k.decode(): v.decode() for k, v in dlq_entries[0][1].items()}
    assert fields_decoded["dlq_error"] == "boom"
    assert fields_decoded["dlq_source"] == Streams.CHAT_EVENTS


async def test_janitor_reclaims_orphaned_entries(redis_client) -> None:
    handled = asyncio.Event()

    async def slow_first_then_ok(envelope: EventEnvelope, msg_id: str) -> None:
        if not handled.is_set():
            raise RuntimeError("first delivery dies without ack")

    bus = EventBus(redis_client)
    envelope = EventEnvelope.create(EventTypes.CHAT_COMPLETED, "corr-3", {})
    await bus.publish(Streams.CHAT_EVENTS, envelope)

    victim = await make_runner(
        redis_client, slow_first_then_ok, consumer="victim"
    )
    await victim.ensure_group()
    await victim._read_and_process()  # noqa: SLF001 - leaves entry in PEL

    pending = await redis_client.xpending(Streams.CHAT_EVENTS, "workers")
    assert pending["pending"] == 1

    # A different consumer's janitor claims the orphaned entry and succeeds.
    async def ok_handler(envelope: EventEnvelope, msg_id: str) -> None:
        handled.set()

    janitor = await make_runner(redis_client, ok_handler, consumer="janitor")
    # redis-py returns (next_start_id, claimed_messages, deleted_ids)
    _, claimed, _deleted = await redis_client.xautoclaim(
        Streams.CHAT_EVENTS,
        "workers",
        "janitor",
        min_idle_time=0,
        start_id="0-0",
    )
    for msg_id, fields in claimed or []:
        await janitor._handle_message(msg_id, fields)  # noqa: SLF001

    assert handled.is_set()
    pending = await redis_client.xpending(Streams.CHAT_EVENTS, "workers")
    assert pending["pending"] == 0
