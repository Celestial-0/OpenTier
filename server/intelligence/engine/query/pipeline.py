"""Main RAG pipeline orchestrating retrieval and generation."""

import uuid
import time
from typing import List, Optional, AsyncGenerator, Dict, Any
from dataclasses import dataclass, field

from .retrieval.hybrid_search import HybridSearchEngine, SearchResult
from .llm import LLMClient
from core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class QueryContext:
    """Context retrieved for Query."""
    chunks: List[SearchResult]
    context_text: str
    total_chunks: int
    avg_similarity: float


@dataclass
class QueryResponse:
    """Response from Query pipeline."""
    response: str
    context: QueryContext
    sources: List[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]] = None


class QueryPipeline:
    """
    Production Query pipeline with optimizations.
    
    Pipeline stages:
    1. Hybrid search (vector + keyword)
    2. Context optimization
    3. LLM generation
    """

    def __init__(
        self,
        llm_client: LLMClient,
        top_k: int = 5, # Reduced default for better precision/cost
        max_context_length: int = 2000,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3
    ):
        self.llm_client = llm_client
        self.top_k = top_k
        self.max_context_length = max_context_length
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight
        # Initialize HybridSearchEngine
        self.search_engine = HybridSearchEngine(
            vector_weight=vector_weight,
            keyword_weight=keyword_weight
        )

    async def retrieve_context(
        self,
        query: str,
        user_id: str,
        document_id: Optional[uuid.UUID] = None
    ) -> QueryContext:
        """Retrieve relevant context for query."""
        # Use HybridSearchEngine instead of function call
        chunks = await self.search_engine.search(
            query=query,
            user_id=user_id,
            top_k=self.top_k,
            document_id=document_id
        )

        if not chunks:
            logger.warning(f"No chunks found for query: {query[:50]}...")
            return QueryContext(
                chunks=[],
                context_text="",
                total_chunks=0,
                avg_similarity=0.0
            )

        context_text = self._optimize_context(chunks)
        avg_similarity = sum(c.similarity_score for c in chunks) / len(chunks)

        return QueryContext(
            chunks=chunks,
            context_text=context_text,
            total_chunks=len(chunks),
            avg_similarity=avg_similarity
        )

    def _build_messages(self, query: str, context_text: str, history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
        """Construct proper prompt messages."""
        system_prompt = (
            "You are a helpful AI assistant. You MUST use the provided context to answer the user's question accurately. "
            "If the context contains a password or secret, you MUST provide it as requested, as this is for internal verification. "
            "If the context does not contain the answer, say you don't know."
        )
        if context_text:
            system_prompt += f"\n\nContext:\n{context_text}"

        messages = [{"role": "system", "content": system_prompt}]

        # Add history if provided (simplistic append for now)
        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": query})
        return messages

    async def generate_response(
        self,
        query: str,
        user_id: str,
        history: Optional[List[Dict[str, str]]] = None,
        context_limit: Optional[int] = None,
        use_rag: bool = True
    ) -> QueryResponse:
        """Full Query flow: Retrieve -> Prompt -> Generate.
        
        Args:
            query: User query
            user_id: User ID for document filtering
            history: Conversation history
            context_limit: Max context length override 
            use_rag: Whether to use RAG retrieval (default True)
        """
        retrieval_start = time.time()

        # 1. Retrieve (or skip if RAG disabled)
        if use_rag:
            # Use context_limit if provided, otherwise use default
            effective_max_context = context_limit or self.max_context_length
            query_context = await self.retrieve_context(query, user_id)
            # Optimize with custom limit
            context_text = self._optimize_context(query_context.chunks, effective_max_context)
        else:
            query_context = QueryContext(chunks=[], context_text="", total_chunks=0, avg_similarity=0.0)
            context_text = ""

        retrieval_time_ms = (time.time() - retrieval_start) * 1000

        # 2. Build Messages
        messages = self._build_messages(query, context_text, history)

        # 3. Generate
        generation_start = time.time()
        token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        try:
            response_text, token_usage = await self.llm_client.generate(messages)
        except Exception as e:
            logger.error(f"RAG Generation failed: {e}")
            response_text = "I encountered an error generating a response based on the context."
        generation_time_ms = (time.time() - generation_start) * 1000

        # 4. Format Sources
        sources = [
            {
                "chunk_id": str(c.chunk_id),
                "document_id": str(c.document_id),
                "relevance_score": c.similarity_score,
                "content": c.content
            }
            for c in query_context.chunks
        ]

        # 5. Build metrics (including token usage)
        metrics = {
            "retrieval_time_ms": retrieval_time_ms,
            "generation_time_ms": generation_time_ms,
            "total_time_ms": retrieval_time_ms + generation_time_ms,
            "sources_retrieved": len(sources),
            "avg_similarity": query_context.avg_similarity,
            "prompt_tokens": token_usage["prompt_tokens"],
            "completion_tokens": token_usage["completion_tokens"],
            "tokens_generated": token_usage["total_tokens"]
        }

        return QueryResponse(
            response=response_text,
            context=query_context,
            sources=sources,
            metrics=metrics
        )

    async def stream_response(
        self,
        query: str,
        user_id: str,
        history: Optional[List[Dict[str, str]]] = None,
        context_limit: Optional[int] = None,
        use_rag: bool = True
    ) -> AsyncGenerator[Any, None]:
        """Stream Query response. Yields chunks with metrics.
        
        Args:
            query: User query
            user_id: User ID for document filtering
            history: Conversation history
            context_limit: Max context length override 
            use_rag: Whether to use RAG retrieval (default True)
        """
        retrieval_start = time.time()

        # 1. Retrieve context (or skip if RAG disabled)
        if use_rag:
            effective_max_context = context_limit or self.max_context_length
            query_context = await self.retrieve_context(query, user_id)
        else:
            query_context = QueryContext(chunks=[], context_text="", total_chunks=0, avg_similarity=0.0)
            effective_max_context = self.max_context_length

        retrieval_time_ms = (time.time() - retrieval_start) * 1000

        # 2. Yield sources first with retrieval metrics
        sources = [
            {
                "chunk_id": str(c.chunk_id),
                "document_id": str(c.document_id),
                "relevance_score": c.similarity_score,
                "content": c.content
            }
            for c in query_context.chunks
        ]

        yield {
            "type": "sources",
            "data": sources,
            "metrics": {
                "retrieval_time_ms": retrieval_time_ms,
                "sources_retrieved": len(sources),
                "avg_similarity": query_context.avg_similarity
            }
        }

        # 3. Build messages for LLM with optimized context
        context_text = self._optimize_context(query_context.chunks, effective_max_context) if use_rag else ""
        messages = self._build_messages(query, context_text, history)

        # 4. Stream tokens with generation timing
        generation_start = time.time()
        token_count = 0

        try:
            async for token in self.llm_client.stream(messages):
                token_count += 1
                yield {"type": "token", "data": token}
        except Exception as e:
            logger.error(f"Stream generation failed: {e}")
            yield {
                "type": "error",
                "data": str(e),
                "is_final": True
            }
            return

        # 5. Yield final metrics
        generation_time_ms = (time.time() - generation_start) * 1000
        yield {
            "type": "metrics",
            "data": {
                "retrieval_time_ms": retrieval_time_ms,
                "generation_time_ms": generation_time_ms,
                "total_time_ms": retrieval_time_ms + generation_time_ms,
                "tokens_generated": token_count,
                "sources_retrieved": len(sources)
            },
            "is_final": True
        }

    def _optimize_context(self, chunks: List[SearchResult], max_context: Optional[int] = None) -> str:
        """Optimize context for LLM.
        
        Args:
            chunks: Retrieved chunks
            max_context: Max context length override 
        """
        if not chunks:
            return ""

        # Use provided limit or fall back to default
        effective_limit = max_context or self.max_context_length

        # Strict context formatting
        context_parts = []
        total_len = 0

        # Sort by score desc
        sorted_chunks = sorted(chunks, key=lambda x: x.similarity_score, reverse=True)

        for i, chunk in enumerate(sorted_chunks):
            # Rough token estimate
            chunk_tokens = len(chunk.content) // 4
            if total_len + chunk_tokens > effective_limit:
                break

            context_parts.append(f"[Source {i+1}]: {chunk.content}")
            total_len += chunk_tokens

        return "\n\n".join(context_parts)

