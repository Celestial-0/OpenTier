"""Hybrid search combining vector and keyword retrieval."""

import uuid
from typing import List, Optional
from dataclasses import dataclass
import numpy as np

from sqlalchemy import select, func, cast
from pgvector.sqlalchemy import Vector
from core.database import get_session, DocumentChunk, Document
from core.logging import get_logger
from engine.embedding import generate_query_embedding

logger = get_logger(__name__)


@dataclass
class SearchResult:
    """Search result with relevance score."""
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    content: str
    similarity_score: float
    rank: int


class HybridSearchEngine:
    """
    Hybrid search engine combining vector and keyword search using SQLAlchemy.
    """

    def __init__(
        self,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3
    ):
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight

    async def search(
        self,
        query: str,
        user_id: str,
        top_k: int = 20,
        document_id: Optional[uuid.UUID] = None
    ) -> List[SearchResult]:
        """
        Perform hybrid search using the database stored procedure.
        """
        query_embedding = await generate_query_embedding(query)
        embedding_list = query_embedding.tolist()

        async with get_session() as session:
            # Using SQLAlchemy func to call the stored procedure
            # Note: We cast the list to Vector to ensure proper parameter binding
            stmt = select(
                func.hybrid_search(
                    cast(embedding_list, Vector(384)),
                    query,
                    user_id,
                    top_k,
                    self.vector_weight,
                    self.keyword_weight
                ).table_valued("chunk_id", "document_id", "content", "similarity_score", "rank")
            )

            result = await session.execute(stmt)
            rows = result.fetchall()

            results = [
                SearchResult(
                    chunk_id=row[0],
                    document_id=row[1],
                    content=row[2],
                    similarity_score=float(row[3]),
                    rank=int(row[4])
                )
                for row in rows
            ]

            logger.info(
                f"Hybrid search: query='{query[:50]}...', "
                f"user={user_id}, results={len(results)}"
            )

            return results

    async def vector_search_only(
        self,
        query: str,
        user_id: str,
        top_k: int = 20
    ) -> List[SearchResult]:
        """
        Perform semantic-only vector search using SQLAlchemy.
        """
        query_embedding = await generate_query_embedding(query)
        embedding_list = query_embedding.tolist()

        async with get_session() as session:
            # We use the <=> operator for cosine distance (1 - similarity)
            # In SQLAlchemy, this is achieved via the distance method on the Vector column
            distance = DocumentChunk.embedding.cosine_distance(embedding_list)

            stmt = (
                select(
                    DocumentChunk.id,
                    DocumentChunk.document_id,
                    DocumentChunk.content,
                    (1 - distance).label("similarity_score"),
                    func.row_number().over(order_by=distance).label("rank")
                )
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(Document.user_id == user_id)
                .order_by(distance)
                .limit(top_k)
            )

            result = await session.execute(stmt)
            rows = result.fetchall()

            return [
                SearchResult(
                    chunk_id=row[0],
                    document_id=row[1],
                    content=row[2],
                    similarity_score=float(row[3]),
                    rank=int(row[4])
                )
                for row in rows
            ]


async def hybrid_search(
    query: str,
    user_id: str,
    top_k: int = 20,
    vector_weight: float = 0.7,
    keyword_weight: float = 0.3
) -> List[SearchResult]:
    engine = HybridSearchEngine(vector_weight, keyword_weight)
    return await engine.search(query, user_id, top_k)
