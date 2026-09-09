"""
Main RAG pipeline orchestrating retrieval and generation.
"""

import uuid
import time
from typing import List, Optional, AsyncGenerator, Dict, Any
from dataclasses import dataclass

from shared.qdrant import SearchResult
from shared.llm import ChatModelGateway as LLMClient
from features.chat.tokenizer import count_tokens
from core.logging import get_logger

logger = get_logger(__name__)


# ==========================================================
# Data Models
# ==========================================================


@dataclass
class QueryContext:
    chunks: List[SearchResult]
    context_text: str
    total_chunks: int
    avg_similarity: float


@dataclass
class QueryResponse:
    response: str
    context: QueryContext
    sources: List[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]] = None


# ==========================================================
# Query Pipeline
# ==========================================================


class QueryPipeline:
    """
    Production-grade RAG pipeline.

    Stages:
    1. Hybrid retrieval
    2. Context optimization
    3. Controlled LLM generation
    """

    def __init__(
        self,
        llm_client: LLMClient,
        top_k: int = 5,
        max_context_length: int = 2000,
        vector_weight: float = 0.7,
        keyword_weight: float = 0.3,
    ):
        self.llm_client = llm_client
        self.top_k = top_k
        self.max_context_length = max_context_length

        # Qdrant is the sole retrieval backend. Lazy so tests can
        # inject fakes via `search_engine` before first use.
        self.search_engine = None
        self._graph_runner = None

    def _maybe_graph(self):
        """Return the LangGraph runner when CHAT_ORCHESTRATOR=graph."""
        import os

        if os.environ.get("CHAT_ORCHESTRATOR", "").strip().lower() != "graph":
            return None
        if self._graph_runner is None:
            from features.chat.graph import ChatGraphRunner

            self._graph_runner = ChatGraphRunner(self)
        return self._graph_runner

    # ==========================================================
    # Retrieval
    # ==========================================================

    async def retrieve_context(
        self, query: str, user_id: str, document_id: Optional[uuid.UUID] = None
    ) -> QueryContext:
        try:
            if self.search_engine is None:
                from shared.qdrant import build_qdrant_retriever

                self.search_engine = build_qdrant_retriever()

            chunks = await self.search_engine.search(
                query=query, user_id=user_id, top_k=self.top_k, document_id=document_id
            )
        except Exception as exc:
            logger.warning("RAG retrieval failed (%s); falling back to non-RAG chat", exc)
            return QueryContext([], "", 0, 0.0)

        if not chunks:
            return QueryContext([], "", 0, 0.0)

        avg_similarity = sum(c.similarity_score for c in chunks) / len(chunks)
        context_text = self._optimize_context(chunks)

        return QueryContext(
            chunks=chunks,
            context_text=context_text,
            total_chunks=len(chunks),
            avg_similarity=avg_similarity,
        )

    # ==========================================================
    # Prompt Construction
    # ==========================================================

    def _build_messages(
        self,
        query: str,
        context_text: str,
        history: Optional[List[Dict[str, str]]] = None,
        user_memory: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        from prompts.loader import render  # deferred: avoids import cycles

        user_section = user_memory if user_memory else "None provided."
        context_section = (
            context_text if context_text else "No external documents provided."
        )

        system_prompt = render(
            "chat_system.md",
            user_section=user_section,
            context_section=context_section,
        ).strip()

        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": query})

        return messages

    # ==========================================================
    # Response Generation
    # ==========================================================

    async def generate_response(
        self,
        query: str,
        user_id: str,
        history: Optional[List[Dict[str, str]]] = None,
        context_limit: Optional[int] = None,
        use_rag: bool = True,
        user_memory: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> QueryResponse:
        graph = self._maybe_graph()
        if graph is not None:
            return await graph.generate_response(
                query=query,
                user_id=user_id,
                history=history,
                context_limit=context_limit,
                use_rag=use_rag,
                user_memory=user_memory,
                temperature=temperature,
                max_tokens=max_tokens,
                model=model,
            )

        retrieval_start = time.time()

        if use_rag:
            query_context = await self.retrieve_context(query, user_id)
            context_text = self._optimize_context(
                query_context.chunks, context_limit or self.max_context_length
            )
        else:
            query_context = QueryContext([], "", 0, 0.0)
            context_text = ""

        retrieval_time_ms = (time.time() - retrieval_start) * 1000

        messages = self._build_messages(
            query=query,
            context_text=context_text,
            history=history,
            user_memory=user_memory,
        )

        generation_start = time.time()
        token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

        try:
            response_text, token_usage = await self.llm_client.generate(
                messages,
                temperature=temperature,
                max_tokens=max_tokens,
                model=model,
            )
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            response_text = "I encountered an error generating a response."

        generation_time_ms = (time.time() - generation_start) * 1000

        sources = [
            {
                "chunk_id": str(c.chunk_id),
                "document_id": str(c.document_id),
                "relevance_score": c.similarity_score,
                "content": c.content,
                "document_title": c.document_title,
                "source_url": getattr(c, "source_url", None),
            }
            for c in query_context.chunks
        ]

        p_toks = token_usage.get("prompt_tokens", 0)
        c_toks = token_usage.get("completion_tokens", 0)
        tot_toks = token_usage.get("total_tokens", p_toks + c_toks)

        metrics = {
            "retrieval_time_ms": retrieval_time_ms,
            "generation_time_ms": generation_time_ms,
            "total_time_ms": retrieval_time_ms + generation_time_ms,
            "sources_retrieved": len(sources),
            "avg_similarity": query_context.avg_similarity,
            "prompt_tokens": p_toks,
            "completion_tokens": c_toks,
            "total_tokens": tot_toks,
            "tokens_generated": c_toks,
        }

        return QueryResponse(
            response=response_text,
            context=query_context,
            sources=sources,
            metrics=metrics,
        )

    # ==========================================================
    # Streaming
    # ==========================================================

    async def stream_response(
        self,
        query: str,
        user_id: str,
        history: Optional[List[Dict[str, str]]] = None,
        context_limit: Optional[int] = None,
        use_rag: bool = True,
        user_memory: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[Any, None]:
        graph = self._maybe_graph()
        if graph is not None:
            async for event in graph.stream_response(
                query=query,
                user_id=user_id,
                history=history,
                context_limit=context_limit,
                use_rag=use_rag,
                user_memory=user_memory,
                temperature=temperature,
                max_tokens=max_tokens,
                model=model,
            ):
                yield event
            return

        retrieval_start = time.time()

        if use_rag:
            query_context = await self.retrieve_context(query, user_id)
        else:
            query_context = QueryContext([], "", 0, 0.0)

        retrieval_time_ms = (time.time() - retrieval_start) * 1000

        sources = [
            {
                "chunk_id": str(c.chunk_id),
                "document_id": str(c.document_id),
                "relevance_score": c.similarity_score,
                "content": c.content,
                "document_title": c.document_title,
                "source_url": getattr(c, "source_url", None),
            }
            for c in query_context.chunks
        ]

        yield {
            "type": "sources",
            "data": sources,
            "metrics": {
                "retrieval_time_ms": retrieval_time_ms,
                "sources_retrieved": len(sources),
                "avg_similarity": query_context.avg_similarity,
            },
        }

        context_text = self._optimize_context(
            query_context.chunks, context_limit or self.max_context_length
        )

        messages = self._build_messages(
            query=query,
            context_text=context_text,
            history=history,
            user_memory=user_memory,
        )

        generation_start = time.time()
        full_response_parts: List[str] = []
        provider_usage: Optional[Dict[str, int]] = None

        try:
            if hasattr(self.llm_client, "stream_with_usage"):
                async for token, usage in self.llm_client.stream_with_usage(
                    messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    model=model,
                ):
                    if usage:
                        provider_usage = usage
                    if token:
                        full_response_parts.append(token)
                        yield {"type": "token", "data": token}
            else:
                async for token in self.llm_client.stream(
                    messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    model=model,
                ):
                    if token:
                        full_response_parts.append(token)
                        yield {"type": "token", "data": token}
        except Exception as e:
            logger.error(f"Stream failed: {e}", exc_info=True)
            yield {"type": "error", "data": e, "is_final": True}
            return

        generation_time_ms = (time.time() - generation_start) * 1000
        full_response_text = "".join(full_response_parts)

        # Provider raw tokens (Gemini / OpenAI usage metadata or tiktoken calculation)
        if provider_usage and provider_usage.get("prompt_tokens"):
            prompt_tokens = provider_usage["prompt_tokens"]
        else:
            try:
                prompt_tokens = sum(
                    count_tokens(m.get("content", "")) for m in messages
                )
            except Exception:
                prompt_tokens = 0

        if provider_usage and provider_usage.get("completion_tokens"):
            completion_tokens = provider_usage["completion_tokens"]
        else:
            try:
                completion_tokens = count_tokens(full_response_text)
            except Exception:
                completion_tokens = len(full_response_text.split())

        p_toks = prompt_tokens or 0
        c_toks = completion_tokens or 0
        tot_toks = p_toks + c_toks

        yield {
            "type": "metrics",
            "data": {
                "retrieval_time_ms": retrieval_time_ms,
                "generation_time_ms": generation_time_ms,
                "total_time_ms": retrieval_time_ms + generation_time_ms,
                "prompt_tokens": p_toks,
                "completion_tokens": c_toks,
                "total_tokens": tot_toks,
                "tokens_generated": c_toks,
                "sources_retrieved": len(sources),
            },
            "is_final": True,
        }

    # ==========================================================
    # Context Optimization
    # ==========================================================

    def _optimize_context(
        self, chunks: List[SearchResult], max_context: Optional[int] = None
    ) -> str:
        if not chunks:
            return ""

        limit = max_context or self.max_context_length
        total_tokens = 0
        context_parts = []

        sorted_chunks = sorted(chunks, key=lambda x: x.similarity_score, reverse=True)

        for i, chunk in enumerate(sorted_chunks):
            approx_tokens = count_tokens(chunk.content)

            if total_tokens + approx_tokens > limit:
                break

            context_parts.append(
                f"[Source {i + 1} | Score: {round(chunk.similarity_score, 3)} | Doc: {chunk.document_id}]\n"
                f"{chunk.content}"
            )

            total_tokens += approx_tokens

        return "\n\n".join(context_parts)

    # ==========================================================
    # Memory Extraction
    # ==========================================================

    async def generate_memory_update(
        self, current_memory: str, recent_messages: List[Dict[str, str]]
    ) -> Optional[str | bool]:
        if not recent_messages:
            return None

        # Build conversation text from recent messages (both user and assistant)
        conversation_lines = []
        for msg in recent_messages[-10:]:  # Last 10 messages for context
            role = "User" if msg["role"] == "user" else "Assistant"
            conversation_lines.append(f"{role}: {msg['content']}")

        conversation_text = "\n".join(conversation_lines)

        system_prompt = """
            You are a memory extraction system. Your ONLY job is to identify and extract personal facts that the user EXPLICITLY and DIRECTLY states about themselves in their messages.

            CRITICAL RULES:
            1. ONLY extract facts from messages where role="user"
            2. ONLY extract facts the user DIRECTLY states about themselves
            3. DO NOT extract anything from Assistant messages
            4. DO NOT infer, assume, or guess anything
            5. DO NOT add facts that are not explicitly stated
            6. DO NOT rephrase in a way that changes or adds meaning
            
            WHAT TO EXTRACT (only if EXPLICITLY stated by user):
            - Personal preferences: "I like pizza", "I prefer dark mode"
            - Personal facts: "I'm allergic to dogs", "I live in New York", "My name is John"
            - Important information: "I work as a software engineer", "I have two kids"
            
            WHAT NOT TO EXTRACT:
            - Questions the user asks (e.g., "What am I allergic to?")
            - Hypothetical statements (e.g., "If I were allergic...")
            - Information about other people
            - Facts from Assistant responses
            - Inferred or assumed information
            - Rephrased versions that add new meaning
            
            EXAMPLES:
            
            User: "I'm allergic to dogs"
            ✓ CORRECT: - User is allergic to dogs
            ✗ WRONG: - User is allergic to dogs
                      - User reacts to dog allergens (this is inference!)
            
            User: "What am I allergic to?"
            ✓ CORRECT: NO_UPDATE (this is a question, not a statement)
            ✗ WRONG: Extracting anything
            
            User: "My name is Sarah and I live in India"
            ✓ CORRECT: - User's name is Sarah
                        - User lives in India
            ✗ WRONG: Adding anything else not stated
            
            OUTPUT FORMAT:
            Write each fact on a new line starting with "- ", like this:
            - User is allergic to dogs
            - User's name is John
            
            SPECIAL COMMANDS:
            - If user explicitly asks to forget everything: output exactly "FORGET_ALL"
            - If there are NO new personal facts stated by the user: output exactly "NO_UPDATE"
            
            REMEMBER: When in doubt, output NO_UPDATE. It's better to miss a fact than to hallucinate one.
            """.strip()

        user_prompt = f"""
            CONVERSATION:
            {conversation_text}

            CURRENT MEMORY:
            {current_memory or "Empty"}

            TASK:
            Extract any NEW personal facts from the conversation that are not already in the current memory.
            Output the new facts in the format specified, or output NO_UPDATE if there are no new facts.
            """.strip()

        try:
            response_text, _ = await self.llm_client.generate(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,  # Lower temperature for more consistent extraction
            )

            result = response_text.strip()

            logger.debug(f"Memory extraction raw result: {result}")

            # Handle special commands
            # Return sentinel string so the consumer can distinguish
            # "forget everything" from "no update" (None).
            if "FORGET_ALL" in result:
                return "FORGET_ALL"

            if result == "NO_UPDATE" or "NO_UPDATE" in result:
                return None

            # Clean up the result
            # Remove any markdown formatting
            result = result.replace("```", "").strip()

            # Filter out hallucinated or uncertain facts
            # Remove lines containing words that indicate uncertainty or lack of information
            uncertain_keywords = [
                "unknown",
                "unspecified",
                "unclear",
                "not mentioned",
                "not stated",
                "not provided",
                "not given",
                "uncertain",
                "no information",
                "no data",
                "not sure",
                "maybe",
                "possibly",
            ]

            filtered_lines = []
            for line in result.split("\n"):
                line = line.strip()
                if not line:
                    continue
                # Check if line contains any uncertain keywords
                line_lower = line.lower()
                if any(keyword in line_lower for keyword in uncertain_keywords):
                    logger.debug(f"Filtered out uncertain fact: {line}")
                    continue
                filtered_lines.append(line)

            result = "\n".join(filtered_lines)

            # If result is too short or empty after filtering, return None
            if len(result) < 5:
                return None

            # Merge with existing memory
            if current_memory:
                # Combine old and new, removing duplicates
                existing_facts = set(
                    line.strip() for line in current_memory.split("\n") if line.strip()
                )
                new_facts = set(
                    line.strip() for line in result.split("\n") if line.strip()
                )
                all_facts = existing_facts | new_facts
                return "\n".join(sorted(all_facts))
            else:
                return result

        except Exception as e:
            logger.error(f"Memory extraction failed: {e}")
            return None
