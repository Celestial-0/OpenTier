"""Phase-4 E2E: durable ingestion via Redis Streams on the LIVE stack.

Enqueues a real ingestion job (publisher path), runs the worker runtime
in-process against real Redis/Qdrant/Postgres, polls the job row until
terminal, asserts completion.
"""

import asyncio
import os
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import text

from shared.database.session import get_engine, get_session_maker


async def job_status(engine, job_id: str) -> str:
    async with engine.connect() as c:
        return (
            await c.execute(
                text("SELECT status FROM ingestion_jobs WHERE id = :id"),
                {"id": job_id},
            )
        ).scalar_one()


async def main() -> int:
    engine = get_engine()


    # ── publisher side (mirrors add_resource minus gRPC) ────────────────
    from features.knowledge.queue import (
        build_params,
        persist_params,
        publish_job,
    )
    from core.events import Streams
    from shared.redis import EventBus, WorkerRuntime, ConsumerSpec, build_redis
    from features.knowledge.repository import JobRepository

    user_id = f"smoke-{uuid.uuid4().hex[:6]}"
    resource_id = str(uuid.uuid4())
    content = f"Durable ingestion smoke {user_id}: tokio rust async"

    client = await build_redis(os.environ["REDIS_URL"])
    bus = EventBus(client)

    async with get_session_maker()() as session:
        job = await JobRepository(session).create_job(user_id=user_id, total_documents=1)
        job_id = str(job.id)
        await persist_params(
            session,
            job.id,
            build_params(
                user_id, resource_id, None, content, None,
                "Phase4 Smoke", {}, None, 0, False,
            ),
        )
        await session.commit()
    await publish_job(bus, uuid.UUID(job_id))
    print(f"enqueued job={job_id}")

    # ── consumer side: in-process worker ────────────────────────────────
    runtime = WorkerRuntime()
    from features.knowledge.worker import handle_ingestion_job

    runtime.add(
        ConsumerSpec(
            stream=Streams.INGESTION_JOBS,
            group="workers",
            handler=handle_ingestion_job,
            consumer_name=f"e2e-{os.getpid()}",
            start_id="0",
        )
    )

    async def wait_terminal(timeout_s: float = 60) -> str:
        for _ in range(int(timeout_s / 0.5)):
            status = await job_status(engine, job_id)
            if status in ("completed", "failed", "partial"):
                return status
            await asyncio.sleep(0.5)
        return "timeout"

    runner = asyncio.create_task(runtime.run_forever(client))
    try:
        status = await asyncio.wait_for(wait_terminal(), timeout=70)
    finally:
        runner.cancel()
        with_suppress = __import__("contextlib").suppress
        with with_suppress(asyncio.CancelledError):
            await runner
        await client.aclose()

    print(f"final_status={status}")
    if status != "completed":
        return 1

    # vectors landed?
    from shared.qdrant.client import QdrantVectorStore

    store = QdrantVectorStore()
    count = await store.count()
    await store.delete_document(resource_id)
    await store.close()
    print(f"qdrant_points={count} cleanup_done")
    assert count >= 1, "expected vectors in Qdrant"
    print("PHASE4_E2E_OK")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
