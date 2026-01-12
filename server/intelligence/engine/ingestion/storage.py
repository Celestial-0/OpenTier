"""Storage layer for document ingestion."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import Document, DocumentChunk, IngestionJob


class DocumentStorage:
    """Storage operations for documents and chunks."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_document(
        self,
        user_id: str,
        title: str,
        content: str,
        document_type: str,
        source_url: str | None = None,
        metadata: dict[str, Any] | None = None,
        document_id: uuid.UUID | None = None,
    ) -> Document:
        """Create a new document."""
        doc = Document(
            id=document_id or uuid.uuid4(),
            user_id=user_id,
            title=title,
            content=content,
            document_type=document_type,
            source_url=source_url,
            metadata_=metadata or {},
        )
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def create_chunk(
        self,
        document_id: uuid.UUID,
        content: str,
        chunk_index: int,
        embedding: list[float] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DocumentChunk:
        """Create a document chunk."""
        chunk = DocumentChunk(
            document_id=document_id,
            content=content,
            chunk_index=chunk_index,
            embedding=embedding,
            metadata_=metadata or {},
        )
        self.session.add(chunk)
        await self.session.flush()
        return chunk

    async def get_document(self, document_id: uuid.UUID) -> Document | None:
        """Get document by ID."""
        result = await self.session.execute(
            select(Document).where(Document.id == document_id)
        )
        return result.scalar_one_or_none()

    async def list_user_documents(
        self,
        user_id: str,
        limit: int = 100,
        offset: int = 0,
        document_type: str | None = None,
    ) -> list[Document]:
        """List documents for a user."""
        query = select(Document).where(Document.user_id == user_id)

        if document_type:
            query = query.where(Document.document_type == document_type)

        query = query.order_by(Document.created_at.desc()).limit(limit).offset(offset)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_user_documents(
        self, user_id: str, document_type: str | None = None
    ) -> int:
        """Count documents for a user."""
        from sqlalchemy import func

        query = select(func.count(Document.id)).where(Document.user_id == user_id)

        if document_type:
            query = query.where(Document.document_type == document_type)

        result = await self.session.execute(query)
        return result.scalar_one()

    async def delete_document(self, document_id: uuid.UUID) -> tuple[bool, int, int]:
        """
        Delete document and its chunks.

        Returns:
            Tuple of (success, chunks_deleted, embeddings_deleted)
        """
        # Count chunks before deletion
        chunk_count_result = await self.session.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )
        chunks = list(chunk_count_result.scalars().all())
        chunk_count = len(chunks)
        embedding_count = sum(1 for c in chunks if c.embedding is not None)

        # Delete chunks (cascade should handle this, but being explicit)
        await self.session.execute(
            delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )

        # Delete document
        result = await self.session.execute(
            delete(Document).where(Document.id == document_id)
        )

        success = result.rowcount > 0
        return success, chunk_count, embedding_count

    async def get_chunks_for_document(
        self, document_id: uuid.UUID
    ) -> list[DocumentChunk]:
        """Get all chunks for a document."""
        result = await self.session.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        )
        return list(result.scalars().all())

    async def get_document_chunk_count(self, document_id: uuid.UUID) -> int:
        """Get count of chunks for a document."""
        from sqlalchemy import func

        result = await self.session.execute(
            select(func.count(DocumentChunk.id)).where(
                DocumentChunk.document_id == document_id
            )
        )
        return result.scalar_one() or 0


class JobStorage:
    """Storage operations for ingestion jobs."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_job(
        self, user_id: str, total_documents: int = 0
    ) -> IngestionJob:
        """Create a new ingestion job."""
        job = IngestionJob(
            user_id=user_id,
            total_documents=total_documents,
            status="queued",
        )
        self.session.add(job)
        await self.session.flush()
        return job

    async def get_job(self, job_id: uuid.UUID) -> IngestionJob | None:
        """Get job by ID."""
        result = await self.session.execute(
            select(IngestionJob).where(IngestionJob.id == job_id)
        )
        return result.scalar_one_or_none()

    async def update_job_status(
        self,
        job_id: uuid.UUID,
        status: str,
        processed_documents: int | None = None,
        failed_documents: int | None = None,
        errors: list[str] | None = None,
        completed_at: datetime | None = None,
    ) -> bool:
        """Update job status."""
        updates: dict[str, Any] = {"status": status}

        if processed_documents is not None:
            updates["processed_documents"] = processed_documents

        if failed_documents is not None:
            updates["failed_documents"] = failed_documents

        if errors is not None:
            updates["errors"] = errors

        if completed_at is not None:
            updates["completed_at"] = completed_at

        # Calculate progress
        job = await self.get_job(job_id)
        if job and job.total_documents > 0:
            total_processed = (processed_documents or job.processed_documents) + (
                failed_documents or job.failed_documents
            )
            updates["progress_percent"] = (total_processed / job.total_documents) * 100

        result = await self.session.execute(
            update(IngestionJob).where(IngestionJob.id == job_id).values(**updates)
        )

        return result.rowcount > 0

    async def increment_processed(self, job_id: uuid.UUID) -> None:
        """Increment processed document count."""
        job = await self.get_job(job_id)
        if job:
            await self.update_job_status(
                job_id,
                status="processing",
                processed_documents=job.processed_documents + 1,
            )

    async def increment_failed(self, job_id: uuid.UUID, error: str) -> None:
        """Increment failed document count and add error."""
        job = await self.get_job(job_id)
        if job:
            errors = job.errors + [error]
            await self.update_job_status(
                job_id,
                status="processing",
                failed_documents=job.failed_documents + 1,
                errors=errors,
            )

    async def complete_job(self, job_id: uuid.UUID) -> None:
        """Mark job as completed."""
        job = await self.get_job(job_id)
        if job:
            status = "completed"
            if job.failed_documents > 0:
                if job.processed_documents == 0:
                    status = "failed"
                else:
                    status = "partial"

            await self.update_job_status(
                job_id,
                status=status,
                completed_at=datetime.now(timezone.utc),
            )
