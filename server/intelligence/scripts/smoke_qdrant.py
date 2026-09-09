"""Live smoke: Qdrant hybrid retrieval + tenant isolation.

Upserts points via the production store adapter, queries through
QdrantHybridRetriever with production embeddings, asserts tenant scoping.
Run:  python scripts/smoke_qdrant.py
"""

import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.llm import HashedSparseEncoder, build_embedding_gateway
from shared.qdrant import QdrantVectorStore, QdrantHybridRetriever


async def main() -> int:
    dense_dim = int(os.environ.get("EMBEDDING_DIMENSIONS", "3072"))
    store = QdrantVectorStore(dense_size=dense_dim)
    await store.ensure_collection()
    embedder = build_embedding_gateway(dense_dim)
    sparse = HashedSparseEncoder()

    ns = uuid.uuid4().hex[:8]  # isolate runs on shared live instance

    docs = [
        ("u1", f"rust async runtime tokio tasks {ns}", False),
        ("u1", f"kubernetes deployment rollout strategy {ns}", True),
        ("u2", f"python asyncio event loop internals {ns}", False),
    ]
    items = []
    doc_ids = {}
    for i, (user, content, is_global) in enumerate(docs):
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{ns}-{i}"))
        doc_ids[i] = doc_id
        dense = (await embedder.embed_documents([content]))[0]
        s_idx, s_val = sparse.encode(content)
        items.append(
            {
                "id": str(uuid.uuid4()),
                "dense": dense,
                "sparse": {"indices": s_idx, "values": s_val},
                "user_id": user,
                "is_global": is_global,
                "document_id": doc_id,
                "chunk_index": 0,
                "content": content,
                "metadata": {},
            }
        )
    await store.upsert_chunks(items)
    print(f"upserted={len(items)}")

    retr = QdrantHybridRetriever(store, embedder, sparse)

    u1_hits = await retr.search(query=f"tokio {ns}", user_id="u1", top_k=5)
    u1_contents = [h.content for h in u1_hits]
    assert any("tokio" in c for c in u1_contents), "u1 private doc missing"
    assert not any("event loop" in c for c in u1_contents), "u2 private LEAKED to u1"
    print(f"u1_hits={len(u1_hits)} isolation_ok=True")

    u2_hits = await retr.search(query=f"asyncio {ns}", user_id="u2", top_k=5)
    assert any("event loop" in h.content for h in u2_hits), "u2 own doc missing"
    assert not any("tokio" in h.content for h in u2_hits), "u1 private LEAKED to u2"

    # global visibility across tenants
    g_hits = await retr.search(query=f"deployment rollout {ns}", user_id="u2", top_k=5)
    assert any("rollout" in h.content for h in g_hits), "global doc hidden from u2"

    # cleanup smoke data
    for i in range(3):
        await store.delete_document(doc_ids[i])
    print("SMOKE_OK upsert/search/isolation/global/cleanup all pass")
    await store.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
