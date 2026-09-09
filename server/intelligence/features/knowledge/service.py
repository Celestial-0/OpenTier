"""Domain application service for knowledge resources."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

from generated import intelligence_pb2
from features.knowledge.queue import (
    build_params,
    persist_params,
    publish_job,
)
from features.knowledge.repository import DocumentRepository, JobRepository
from shared.database.session import get_session
from shared.redis.bus import EventBus
from shared.redis.client import build_redis

logger = logging.getLogger(__name__)


class KnowledgeService:
    """Orchestrates resource ingestion, status, listing, and lifecycle."""

    def __init__(self, session_factory=None, redis_client=None) -> None:
        self._session_factory = session_factory or get_session
        self._redis_client = redis_client
        self._bus: EventBus | None = None

    async def _get_bus(self) -> EventBus:
        if self._bus is None:
            if self._redis_client is None:
                url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
                self._redis_client = await build_redis(url)
            self._bus = EventBus(self._redis_client)
        return self._bus

    async def add_resource(
        self,
        *,
        user_id: str,
        resource_id: str | None = None,
        url: str | None = None,
        text: str | None = None,
        file_content: bytes | None = None,
        title: str | None = None,
        metadata: dict[str, str] | None = None,
        config: intelligence_pb2.IngestionConfig | None = None,
        resource_type: int = intelligence_pb2.RESOURCE_TYPE_UNSPECIFIED,
        is_global: bool = False,
    ) -> intelligence_pb2.AddResourceResponse:
        doc_id = resource_id or str(uuid.uuid4())

        async with self._session_factory() as session:
            job_repo = JobRepository(session)
            job = await job_repo.create_job(user_id=user_id, total_documents=1)
            job_id_str = str(job.id)

            config_dict: dict[str, Any] = {}
            if config is not None:
                config_dict = {
                    f: getattr(config, f)
                    for f in (
                        "chunk_size",
                        "chunk_overlap",
                        "auto_clean",
                        "generate_embeddings",
                        "max_depth",
                        "follow_links",
                    )
                    if hasattr(config, f)
                }

            params = build_params(
                user_id=user_id,
                resource_id=doc_id,
                url=url,
                text_content=text,
                file_content=file_content,
                title=title,
                metadata=metadata or {},
                config_dict=config_dict,
                resource_type=resource_type,
                is_global=is_global,
            )
            await persist_params(session, uuid.UUID(job_id_str), params)

        try:
            bus = await self._get_bus()
            await publish_job(bus, uuid.UUID(job_id_str))
        except Exception as exc:
            logger.critical("Failed to enqueue ingestion job %s: %s", job_id_str, exc)
            async with self._session_factory() as session:
                await JobRepository(session).update_job_status(
                    uuid.UUID(job_id_str), "failed"
                )
            raise

        logger.info(
            "Queued ingestion job %s for resource %s (user=%s)",
            job_id_str,
            doc_id,
            user_id,
        )
        return intelligence_pb2.AddResourceResponse(
            job_id=job_id_str,
            resource_id=doc_id,
            status=intelligence_pb2.RESOURCE_STATUS_QUEUED,
        )

    async def get_resource_status(
        self, job_id: str, resource_id: str, user_id: str = ""
    ) -> intelligence_pb2.ResourceStatusResponse:
        async with self._session_factory() as session:
            job_repo = JobRepository(session)
            doc_repo = DocumentRepository(session)

            job = None
            actual_job_id = job_id

            if job_id:
                job = await job_repo.get_job(uuid.UUID(job_id))
                if job and user_id and job.user_id != user_id:
                    logger.warning(
                        "User %s attempted to access job %s owned by %s",
                        user_id,
                        job_id,
                        job.user_id,
                    )
                    return intelligence_pb2.ResourceStatusResponse(
                        job_id=job_id,
                        resource_id=resource_id,
                        status=intelligence_pb2.RESOURCE_STATUS_UNSPECIFIED,
                        error="Access denied: job belongs to another user",
                    )
            elif resource_id:
                doc = await doc_repo.get_document(uuid.UUID(resource_id))
                if doc and user_id and doc.user_id != user_id:
                    logger.warning(
                        "User %s attempted to access resource %s owned by %s",
                        user_id,
                        resource_id,
                        doc.user_id,
                    )
                    return intelligence_pb2.ResourceStatusResponse(
                        job_id="",
                        resource_id=resource_id,
                        status=intelligence_pb2.RESOURCE_STATUS_UNSPECIFIED,
                        error="Access denied: resource belongs to another user",
                    )
                if doc and doc.metadata_ and "job_id" in doc.metadata_:
                    actual_job_id = doc.metadata_["job_id"]
                    job = await job_repo.get_job(uuid.UUID(actual_job_id))

            status = intelligence_pb2.RESOURCE_STATUS_UNSPECIFIED
            if job:
                if job.status == "queued":
                    status = intelligence_pb2.RESOURCE_STATUS_QUEUED
                elif job.status == "processing":
                    status = intelligence_pb2.RESOURCE_STATUS_PROCESSING
                elif job.status == "completed":
                    status = intelligence_pb2.RESOURCE_STATUS_COMPLETED
                elif job.status == "failed":
                    status = intelligence_pb2.RESOURCE_STATUS_FAILED
                elif job.status == "partial":
                    status = intelligence_pb2.RESOURCE_STATUS_PARTIAL

            chunks_created = 0
            if resource_id:
                try:
                    chunks_created = await doc_repo.get_document_chunk_count(
                        uuid.UUID(resource_id)
                    )
                except Exception:
                    chunks_created = job.processed_documents if job else 0
            elif job:
                chunks_created = job.processed_documents

            return intelligence_pb2.ResourceStatusResponse(
                job_id=actual_job_id or "",
                resource_id=resource_id,
                status=status,
                chunks_created=chunks_created,
                error=str(job.errors[0]) if job and job.errors else None,
                progress=job.progress_percent if job else 0.0,
            )

    async def list_resources(
        self,
        user_id: str,
        limit: int = 50,
        cursor: str | None = None,
        type_filter: int | None = None,
        status_filter: int | None = None,
    ) -> intelligence_pb2.ListResourcesResponse:
        async with self._session_factory() as session:
            doc_repo = DocumentRepository(session)
            job_repo = JobRepository(session)

            offset = int(cursor) if cursor and cursor.isdigit() else 0
            docs = await doc_repo.list_user_documents(
                user_id, limit=limit, offset=offset
            )
            total_count = await doc_repo.count_user_documents(user_id)

            job_cache: dict[str, Any] = {}

            async def _job_status(job_id_str: str):
                if job_id_str not in job_cache:
                    try:
                        job_cache[job_id_str] = await job_repo.get_job(
                            uuid.UUID(job_id_str)
                        )
                    except Exception:
                        job_cache[job_id_str] = None
                return job_cache[job_id_str]

            status_map = {
                "queued": intelligence_pb2.RESOURCE_STATUS_QUEUED,
                "processing": intelligence_pb2.RESOURCE_STATUS_PROCESSING,
                "failed": intelligence_pb2.RESOURCE_STATUS_FAILED,
                "partial": intelligence_pb2.RESOURCE_STATUS_PARTIAL,
            }

            items = []
            for d in docs:
                chunk_count = await doc_repo.get_document_chunk_count(d.id)
                try:
                    mapped_type_name = d.document_type.replace("DOCUMENT", "RESOURCE")
                    res_type = intelligence_pb2.ResourceType.Value(mapped_type_name)
                except ValueError:
                    res_type = intelligence_pb2.RESOURCE_TYPE_UNSPECIFIED

                job_id_str = (d.metadata_ or {}).get("job_id", "")
                status_val = intelligence_pb2.RESOURCE_STATUS_COMPLETED
                if job_id_str:
                    job_row = await _job_status(job_id_str)
                    jstatus = getattr(job_row, "status", "") or ""
                    status_val = status_map.get(
                        jstatus, intelligence_pb2.RESOURCE_STATUS_COMPLETED
                    )
                elif chunk_count == 0:
                    status_val = intelligence_pb2.RESOURCE_STATUS_FAILED

                if status_filter is not None and status_val != int(status_filter):
                    continue
                if type_filter is not None and res_type != int(type_filter):
                    continue

                stats = intelligence_pb2.ResourceStats(documents=1, chunks=chunk_count)
                items.append(
                    intelligence_pb2.ResourceItem(
                        id=str(d.id),
                        type=res_type,
                        content=str(d.content)[:100] if d.content else "",
                        status=status_val,
                        created_at=int(d.created_at.timestamp()),
                        metadata=dict(d.metadata_) if d.metadata_ else {},
                        stats=stats,
                        is_global=d.is_global,
                    )
                )

            next_cursor = (
                str(offset + len(docs)) if len(docs) == limit else None
            )

            return intelligence_pb2.ListResourcesResponse(
                items=items,
                next_cursor=next_cursor,
                total_count=total_count,
            )

    async def delete_resource(self, resource_id: str, user_id: str = "") -> bool:
        async with self._session_factory() as session:
            doc_repo = DocumentRepository(session)
            if user_id:
                doc = await doc_repo.get_document(uuid.UUID(resource_id))
                if doc and doc.user_id != user_id:
                    logger.warning(
                        "User %s attempted to delete resource %s owned by %s",
                        user_id,
                        resource_id,
                        doc.user_id,
                    )
                    return False

            success, _, _ = await doc_repo.delete_document(uuid.UUID(resource_id))
            return success

    async def cancel_ingestion(self, job_id: str, user_id: str) -> tuple[bool, str]:
        async with self._session_factory() as session:
            job_repo = JobRepository(session)
            try:
                job = await job_repo.get_job(uuid.UUID(job_id))
                if not job:
                    return False, f"Job {job_id} not found"
                if job.status not in ["queued", "processing"]:
                    return False, f"Cannot cancel job in {job.status} state"
                await job_repo.update_job_status(
                    uuid.UUID(job_id),
                    status="failed",
                    errors=[f"Cancelled by user {user_id}"],
                )
                return True, "Job cancelled"
            except Exception as e:
                return False, f"Cancel failed: {e}"

    async def reembed_all(
        self, model_slug: str | None = None
    ) -> intelligence_pb2.ReembedAllResponse:
        from sqlalchemy import text
        from shared.llm.catalog import ModelCatalog
        from shared.llm.embeddings import build_embedding_gateway, HashedSparseEncoder
        from shared.qdrant import QdrantVectorStore

        # 1. Resolve active embedding model
        catalog = ModelCatalog(self._session_factory)
        if model_slug:
            state = await catalog._state()
            entry = state.by_slug.get(model_slug)
            if entry is None or entry.kind != "embedding":
                raise ValueError(f"Embedding model not found/enabled: {model_slug}")
        else:
            entry = await catalog.default_embedding()

        target_dims = entry.dimensions or 3072
        target_slug = entry.slug
        provider_slug = entry.provider.slug
        base_url = entry.provider.base_url

        # Decrypt / resolve the API key for this specific provider (Google key for Google, OpenAI key for OpenAI)
        api_key = await catalog.provider_api_key(entry.provider)
        if not api_key:
            raise ValueError(
                f"No API key configured for provider '{provider_slug}' ({entry.provider.slug}). "
                f"Please add an API key in the admin dashboard under AI Providers."
            )

        logger.info(
            "Re-embedding all documents with model %s (%d dimensions) using %s provider (endpoint: %s)",
            target_slug,
            target_dims,
            provider_slug.upper(),
            base_url,
        )

        # 2. Recreate Qdrant collection with the target dimension
        store = QdrantVectorStore(dense_size=target_dims)
        await store.recreate_collection(dense_size=target_dims)

        # 3. Setup embedder & sparse encoder with the resolved provider, model, API key, base URL, and dimensions
        embedder = build_embedding_gateway(
            default_dims=target_dims,
            model_slug=target_slug,
            api_key=api_key,
            base_url=base_url,
            provider_slug=provider_slug,
        )
        sparse = HashedSparseEncoder()

        # 4. Read all document chunks from PostgreSQL
        reembedded_count = 0
        batch_size = 50 if provider_slug == "google" else 64
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    text(
                        "SELECT c.id::text, c.content, c.chunk_index, "
                        "       c.metadata AS metadata, "
                        "       d.id::text AS document_id, "
                        "       COALESCE(d.user_id, '') AS user_id, "
                        "       COALESCE(d.title, '') AS document_title, "
                        "       COALESCE(d.source_url, '') AS source_url, "
                        "       COALESCE(d.is_global, FALSE) AS is_global "
                        "FROM document_chunks c "
                        "JOIN documents d ON d.id = c.document_id "
                        "ORDER BY c.document_id, c.chunk_index"
                    )
                )
            ).all()

        logger.info("Found %d chunks to re-embed with %s (%s)", len(rows), target_slug, provider_slug)

        for i in range(0, len(rows), batch_size):
            batch = rows[i : i + batch_size]
            texts = [r.content for r in batch]
            dense_vecs = await embedder.embed_documents(texts)
            points = []
            for j, r in enumerate(batch):
                s_idx, s_val = sparse.encode(r.content)
                points.append(
                    {
                        "id": r.id,
                        "dense": dense_vecs[j],
                        "sparse": {"indices": s_idx, "values": s_val},
                        "user_id": r.user_id,
                        "is_global": r.is_global,
                        "document_id": r.document_id,
                        "chunk_index": r.chunk_index,
                        "content": r.content,
                        "metadata": r.metadata or {},
                        "document_title": r.document_title,
                        "source_url": r.source_url,
                    }
                )
            await store.upsert_chunks(points)
            reembedded_count += len(batch)
            logger.info(
                "Re-embedding progress: %d/%d chunks indexed (%s)",
                reembedded_count,
                len(rows),
                target_slug,
            )
            # Pacing between batches to stay under provider rate limits (e.g. Google AI Studio 15 RPM)
            pace_sleep = 1.0 if provider_slug == "google" else 0.3
            await asyncio.sleep(pace_sleep)

        logger.info(
            "Re-embedding complete: %d chunks indexed with %s (%dd)",
            reembedded_count,
            target_slug,
            target_dims,
        )

        return intelligence_pb2.ReembedAllResponse(
            reembedded_chunks=reembedded_count,
            dimensions=target_dims,
            model_slug=target_slug,
            status="completed",
        )


__all__ = ["KnowledgeService"]
