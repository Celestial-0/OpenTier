"""Qdrant vector store adapter and hybrid retriever.

System of record for vector embeddings (dense + sparse with server-side RRF fusion).
"""

from __future__ import annotations

import logging
import os
import uuid
from dataclasses import dataclass
from typing import Any, List, Optional, Sequence

from qdrant_client import AsyncQdrantClient, models

logger = logging.getLogger(__name__)

COLLECTION = "knowledge_chunks"
ALIAS = "knowledge"
DENSE = "dense"
SPARSE = "sparse"


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    document_id: str
    content: str
    similarity_score: float
    document_title: Optional[str] = None
    source_url: Optional[str] = None


@dataclass
class SearchResult:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    content: str
    similarity_score: float
    rank: int
    document_title: Optional[str] = None
    source_url: Optional[str] = None


def _dedupe_sparse(indices: list[int], values: list[float]) -> tuple[list[int], list[float]]:
    if not indices:
        return [], []
    merged: dict[int, float] = {}
    for idx, val in zip(indices, values):
        merged[idx] = merged.get(idx, 0.0) + val
    sorted_pairs = sorted(merged.items(), key=lambda x: x[0])
    return [p[0] for p in sorted_pairs], [round(p[1], 6) for p in sorted_pairs]


class QdrantVectorStore:
    """Thin async adapter over qdrant-client. One instance per process."""

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        dense_size: Optional[int] = None,
    ) -> None:
        self._url = url or os.environ.get("QDRANT_URL", "http://localhost:6333")
        self._api_key = api_key or os.environ.get("QDRANT_API_KEY") or None
        if dense_size is not None:
            self._dense_size = dense_size
        else:
            env_dim = os.environ.get("EMBEDDING_DIMENSIONS") or os.environ.get("EMBEDDING_DIMS")
            self._dense_size = int(env_dim) if env_dim else 3072
        self._client = AsyncQdrantClient(url=self._url, api_key=self._api_key)

    async def close(self) -> None:
        await self._client.close()

    # ── lifecycle ────────────────────────────────────────────────────────

    async def recreate_collection(self, dense_size: Optional[int] = None) -> None:
        """Drop existing collection and create a fresh one with the target dimension."""
        if dense_size is not None:
            self._dense_size = dense_size
        if await self._client.collection_exists(COLLECTION):
            await self._client.delete_collection(COLLECTION)
        await self.ensure_collection()

    async def ensure_collection(self) -> None:
        if await self._client.collection_exists(COLLECTION):
            try:
                info = await self._client.get_collection(COLLECTION)
                vec_params = info.config.params.vectors
                current_size = None
                if isinstance(vec_params, dict) and DENSE in vec_params:
                    current_size = getattr(vec_params[DENSE], "size", None)
                elif hasattr(vec_params, "size"):
                    current_size = vec_params.size
                
                if current_size is not None and current_size == self._dense_size:
                    return
                logger.warning(
                    "Qdrant collection '%s' dimension mismatch (current=%s, required=%d). Recreating.",
                    COLLECTION, current_size, self._dense_size,
                )
                await self._client.delete_collection(COLLECTION)
            except Exception as exc:
                logger.warning("Error inspecting Qdrant collection vectors (%s); recreating", exc)
                try:
                    await self._client.delete_collection(COLLECTION)
                except Exception:
                    pass
        await self._client.create_collection(
            collection_name=COLLECTION,
            vectors_config={
                DENSE: models.VectorParams(
                    size=self._dense_size,
                    distance=models.Distance.COSINE,
                )
            },
            sparse_vectors_config={
                SPARSE: models.SparseVectorParams(),
            },
            hnsw_config=models.HnswConfigDiff(m=16, ef_construct=128),
        )
        # Tenant partitioning: co-locate per-user vectors + filterable fields.
        await self._client.create_payload_index(
            collection_name=COLLECTION,
            field_name="user_id",
            field_schema=models.KeywordIndexParams(
                type=models.KeywordIndexType.KEYWORD, is_tenant=True
            ),
        )
        await self._client.create_payload_index(
            collection_name=COLLECTION,
            field_name="is_global",
            field_schema=models.PayloadSchemaType.BOOL,
        )
        await self._client.create_payload_index(
            collection_name=COLLECTION,
            field_name="document_id",
            field_schema=models.PayloadSchemaType.KEYWORD,
        )
        await self._client.create_payload_index(
            collection_name=COLLECTION,
            field_name="chunk_index",
            field_schema=models.PayloadSchemaType.INTEGER,
        )

    async def exists(self) -> bool:
        return await self._client.collection_exists(COLLECTION)

    async def count(self) -> int:
        result = await self._client.count(COLLECTION, exact=True)
        return result.count

    # ── writes ───────────────────────────────────────────────────────────

    async def upsert_chunks(
        self,
        items: Sequence[dict[str, Any]],
    ) -> int:
        """items: [{id, dense, sparse(indices,values), user_id, is_global,
                    document_id, chunk_index, content, metadata}]"""
        if not items:
            return 0
        points = []
        for item in items:
            s_idx, s_val = _dedupe_sparse(
                item["sparse"]["indices"], item["sparse"]["values"]
            )
            points.append(
                models.PointStruct(
                    id=item["id"],
                    vector={
                        DENSE: item["dense"],
                        SPARSE: models.SparseVector(
                            indices=s_idx,
                            values=s_val,
                        ),
                    },
                    payload={
                        "user_id": item["user_id"],
                        "is_global": bool(item.get("is_global", False)),
                        "document_id": str(item["document_id"]),
                        "chunk_index": int(item.get("chunk_index", 0)),
                        "content": item["content"],
                        "metadata": item.get("metadata") or {},
                        "document_title": str(item.get("document_title") or item.get("title") or ""),
                        "source_url": str(item.get("source_url") or ""),
                    },
                )
            )
        await self._client.upsert(collection_name=COLLECTION, points=points)
        return len(points)

    async def delete_document(self, document_id: str) -> None:
        await self._client.delete(
            collection_name=COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(
                        key="document_id", match=models.MatchValue(value=document_id)
                    )]
                )
            ),
        )

    async def delete_user_data(self, user_id: str) -> None:
        await self._client.delete(
            collection_name=COLLECTION,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(
                        key="user_id", match=models.MatchValue(value=user_id)
                    )]
                )
            ),
        )

    # ── retrieval ────────────────────────────────────────────────────────

    async def hybrid_search(
        self,
        query_dense: list[float],
        query_sparse_indices: list[int],
        query_sparse_values: list[float],
        user_id: str,
        top_k: int = 5,
    ) -> list[RetrievedChunk]:
        """Dense + sparse with server-side RRF fusion."""
        tenant_filter = models.Filter(
            should=[
                models.FieldCondition(
                    key="user_id", match=models.MatchValue(value=user_id)
                ),
                models.FieldCondition(key="is_global", match=models.MatchValue(value=True)),
            ]
        )
        q_idx, q_val = _dedupe_sparse(query_sparse_indices, query_sparse_values)
        response = await self._client.query_points(
            collection_name=COLLECTION,
            prefetch=[
                models.Prefetch(
                    query=query_dense, using=DENSE, limit=top_k * 4,
                    filter=tenant_filter,
                ),
                models.Prefetch(
                    query=models.SparseVector(
                        indices=q_idx,
                        values=q_val,
                    ),
                    using=SPARSE, limit=top_k * 4, filter=tenant_filter,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=top_k,
            with_payload=True,
        )
        chunks: list[RetrievedChunk] = []
        for point in response.points:
            payload = point.payload or {}
            raw_title = str(payload.get("document_title") or payload.get("title") or "").strip()
            raw_url = str(payload.get("source_url") or "").strip()
            chunks.append(
                RetrievedChunk(
                    chunk_id=str(point.id),
                    document_id=str(payload.get("document_id", "")),
                    content=str(payload.get("content", "")),
                    similarity_score=float(point.score),
                    document_title=raw_title if raw_title else None,
                    source_url=raw_url if raw_url else None,
                )
            )
        return chunks


class QdrantHybridRetriever:
    """Retriever converting Qdrant hybrid search results to domain SearchResult objects."""

    def __init__(
        self,
        store: QdrantVectorStore,
        embedding_gateway,
        sparse_encoder=None,
    ) -> None:
        from shared.llm.embeddings import HashedSparseEncoder

        self.store = store
        self.embedder = embedding_gateway
        self.sparse = sparse_encoder or HashedSparseEncoder()

    async def search(
        self,
        query: str,
        user_id: str,
        top_k: int = 20,
        document_id: Optional[uuid.UUID] = None,
    ) -> List[SearchResult]:
        dense = await self.embedder.embed_query(query)
        s_idx, s_val = self.sparse.encode(query)
        hits = await self.store.hybrid_search(
            query_dense=dense,
            query_sparse_indices=s_idx,
            query_sparse_values=s_val,
            user_id=user_id,
            top_k=top_k,
        )

        # Look up missing document titles/URLs from DB if not present in Qdrant payload
        missing_doc_ids: set[uuid.UUID] = set()
        for hit in hits:
            if not hit.document_title and hit.document_id:
                try:
                    missing_doc_ids.add(uuid.UUID(hit.document_id))
                except ValueError:
                    pass

        title_map: dict[uuid.UUID, tuple[str, Optional[str]]] = {}
        if missing_doc_ids:
            try:
                from shared.database.session import get_session
                from sqlalchemy import text
                async with get_session() as session:
                    rows = (
                        await session.execute(
                            text("SELECT id, title, source_url FROM documents WHERE id = ANY(:ids)"),
                            {"ids": list(missing_doc_ids)},
                        )
                    ).all()
                    for r in rows:
                        title_map[r[0]] = (r[1], r[2])
            except Exception as e:
                logger.debug("Failed to lookup document titles from DB: %s", e)

        results: List[SearchResult] = []
        for rank, hit in enumerate(hits):
            try:
                doc_id = uuid.UUID(hit.document_id)
                chunk_id = uuid.UUID(hit.chunk_id)
            except ValueError:
                continue
            if document_id is not None and doc_id != document_id:
                continue

            doc_title = hit.document_title
            src_url = hit.source_url
            if not doc_title and doc_id in title_map:
                doc_title = title_map[doc_id][0]
                if not src_url:
                    src_url = title_map[doc_id][1]

            results.append(
                SearchResult(
                    chunk_id=chunk_id,
                    document_id=doc_id,
                    content=hit.content,
                    similarity_score=hit.similarity_score,
                    rank=rank,
                    document_title=doc_title,
                    source_url=src_url,
                )
            )
        return results


def build_qdrant_retriever(dense_size: Optional[int] = None) -> QdrantHybridRetriever:
    from shared.llm.embeddings import build_embedding_gateway

    gateway = build_embedding_gateway(default_dims=dense_size or 3072)
    actual_dims = getattr(gateway, "dims", dense_size or 3072)
    store = QdrantVectorStore(dense_size=actual_dims)
    return QdrantHybridRetriever(store, gateway)
