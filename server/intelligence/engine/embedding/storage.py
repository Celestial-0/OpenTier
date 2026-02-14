"""Storage operations for embeddings."""

import uuid
from typing import List, Optional
import numpy as np
from dataclasses import dataclass

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import DocumentChunk
from core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class EmbeddingRecord:
    """Embedding database record."""

    id: uuid.UUID
    chunk_id: uuid.UUID
    embedding: np.ndarray
    document_id: uuid.UUID
    user_id: str
    chunk_index: int


class EmbeddingStorage:
    """
    Manages embedding storage and retrieval from PostgreSQL using SQLAlchemy ORM.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def store_embedding(
        self,
        chunk_id: uuid.UUID,
        embedding: np.ndarray,
        document_id: uuid.UUID,
        user_id: str,
        chunk_index: int,
    ) -> uuid.UUID:
        """
        Store a single embedding by updating an existing chunk.
        """
        embedding_list = embedding.tolist()

        await self.session.execute(
            update(DocumentChunk)
            .where(DocumentChunk.id == chunk_id)
            .values(embedding=embedding_list)
        )

        logger.debug(f"Stored embedding for chunk {chunk_id}")
        return chunk_id

    async def store_embeddings_batch(
        self,
        chunk_ids: List[uuid.UUID],
        embeddings: np.ndarray,
        document_id: uuid.UUID,
        user_id: str,
        chunk_indices: List[int],
    ) -> List[uuid.UUID]:
        """
        Store multiple embeddings in a batch by updating existing chunks.
        """
        if len(chunk_ids) != len(embeddings):
            raise ValueError("Mismatched lengths for batch insert")

        # Prepare batch data for execute
        batch_data = [
            {"id": chunk_ids[i], "embedding": embeddings[i].tolist()}
            for i in range(len(chunk_ids))
        ]

        await self.session.execute(update(DocumentChunk), batch_data)

        logger.info(f"Updated {len(chunk_ids)} embeddings for document {document_id}")

        return chunk_ids

    async def get_embedding(self, embedding_id: uuid.UUID) -> Optional[EmbeddingRecord]:
        """
        Retrieve an embedding by chunk ID.
        """
        result = await self.session.execute(
            select(DocumentChunk).where(DocumentChunk.id == embedding_id)
        )
        chunk = result.scalar_one_or_none()

        if not chunk or chunk.embedding is None:
            return None

        return EmbeddingRecord(
            id=chunk.id,
            chunk_id=chunk.id,
            embedding=np.array(chunk.embedding),
            document_id=chunk.document_id,
            user_id="",  # user_id is on Document, not Chunk in current schema
            chunk_index=chunk.chunk_index,
        )

    async def delete_embeddings_for_document(self, document_id: uuid.UUID) -> int:
        """
        Clear all embeddings for a document.
        """
        result = await self.session.execute(
            update(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .values(embedding=None)
        )

        count = result.rowcount
        logger.info(f"Cleared {count} embeddings for document {document_id}")
        return count
