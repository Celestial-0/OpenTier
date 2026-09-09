"""Backfill worker: Postgres chunk texts -> Qdrant vectors.

Idempotent (chunk UUID keys), resumable (checkpoint = last chunk id, stored
in Redis when available else local file).

Run:
    uv run python scripts/backfill_qdrant.py --batch 64 [--limit N]
"""


from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CHECKPOINT_FILE = Path(".backfill_checkpoint")


async def _load_checkpoint(redis_client=None) -> str | None:
    if redis_client is not None:
        val = await redis_client.get("ot:intel:backfill:last_chunk")
        return val.decode() if isinstance(val, bytes) else val
    if CHECKPOINT_FILE.exists():
        return CHECKPOINT_FILE.read_text(encoding="utf-8").strip() or None
    return None


async def _save_checkpoint(value: str, redis_client=None) -> None:
    if redis_client is not None:
        await redis_client.set("ot:intel:backfill:last_chunk", value)
    CHECKPOINT_FILE.write_text(value, encoding="utf-8")


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=64)
    parser.add_argument("--limit", type=int, default=0, help="max chunks (0=all)")
    args = parser.parse_args()

    from sqlalchemy import text

    from shared.database.session import get_engine

    from shared.llm import HashedSparseEncoder, build_embedding_gateway
    from shared.qdrant import QdrantVectorStore
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

    engine = get_engine()
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


    redis_client = None
    redis_url = os.environ.get("REDIS_URL", "").strip()
    if redis_url:
        import redis.asyncio as aioredis

        redis_client = aioredis.from_url(redis_url, decode_responses=False)

    store = QdrantVectorStore()
    await store.ensure_collection()
    embedder = build_embedding_gateway()
    sparse = HashedSparseEncoder()

    checkpoint = await _load_checkpoint(redis_client)
    print(f"backfill start: batch={args.batch} limit={args.limit} "
          f"backend={os.environ.get('EMBEDDING_BACKEND', 'openai')} "
          f"resume_from={checkpoint}")

    total = embedded_last = 0
    try:
        while True:
            async with maker() as session:
                params: dict = {"after": checkpoint or ""}
                limit_clause = "LIMIT :lim" if args.limit else "LIMIT :lim"
                remaining = (
                    args.limit - total if args.limit else args.batch
                )
                params["lim"] = min(args.batch, max(remaining, 1))
                rows = (
                    await session.execute(
                        text(
                            "SELECT c.id::text, c.content, c.chunk_index, "
                            "       d.id::text AS doc_id, "
                            "       COALESCE(d.user_id, '') AS user_id, "
                            "       COALESCE(d.is_global, FALSE) AS is_global "
                            "FROM document_chunks c "
                            "JOIN documents d ON d.id = c.document_id "
                            "WHERE c.id::text > :after "
                            "ORDER BY c.id::text "
                            f"{limit_clause}"
                        ),
                        params,
                    )
                ).all()

            if not rows:
                break

            dense_vecs = await embedder.embed_documents([r[1] for r in rows])
            points = []
            for r, dense in zip(rows, dense_vecs):
                chunk_id, content, chunk_index, doc_id, user_id, is_global = r
                s_idx, s_val = sparse.encode(content)
                points.append(
                    {
                        "id": chunk_id,
                        "dense": dense,
                        "sparse": {"indices": s_idx, "values": s_val},
                        "user_id": str(user_id or ""),
                        "is_global": bool(is_global),
                        "document_id": doc_id,
                        "chunk_index": int(chunk_index or 0),
                        "content": content,
                        "metadata": {},
                    }
                )
            await store.upsert_chunks(points)

            total += len(points)
            checkpoint = rows[-1][0]
            await _save_checkpoint(checkpoint, redis_client)
            print(f"batch done: +{len(points)} (total={total})")

            if args.limit and total >= args.limit:
                break
    finally:
        await store.close()
        if redis_client is not None:
            await redis_client.aclose()
        await engine.dispose()

    print(f"backfill complete: {total} chunks indexed "
          f"({'no new rows' if total == embedded_last == 0 else ''})".strip())
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
