"""LangGraph chat orchestration.

Replicates `QueryPipeline.stream_response / generate_response` contracts
exactly — same `{type: sources|token|metrics|error}` dict-stream, same metric
fields — while running the stages as a StateGraph. Retrieval and generation
reuse the pipeline's own search engine, prompt builder, and LLM gateway.
"""

from __future__ import annotations

import os
import time
from typing import Any, AsyncGenerator, Dict, List, Optional, TypedDict

from langgraph.graph import END, StateGraph

from features.chat.pipeline import QueryContext, QueryResponse
from features.chat.tokenizer import count_tokens


def use_chat_graph() -> bool:
    return (
        os.environ.get("CHAT_ORCHESTRATOR", "").strip().lower() == "graph"
    )


class ChatState(TypedDict, total=False):
    # inputs
    query: str
    user_id: str
    history: List[Dict[str, str]]
    user_memory: Optional[str]
    context_limit: Optional[int]
    use_rag: bool
    temperature: Optional[float]
    max_tokens: Optional[int]
    model: Optional[str]
    pipeline: Any  # non-serializable handle; graph is stateless per turn
    # intermediates / outputs
    query_context: Any  # QueryContext
    messages: List[Dict[str, str]]
    response_text: str
    token_count: int
    retrieval_time_ms: float
    generation_time_ms: float
    error: Optional[str]


def _sources(query_context: QueryContext) -> List[Dict[str, Any]]:
    return [
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


async def _retrieve(state: ChatState) -> Dict[str, Any]:
    pipeline = state["pipeline"]
    start = time.time()
    if state.get("use_rag", True):
        query_context: QueryContext = await pipeline.retrieve_context(
            state["query"], state["user_id"]
        )
    else:
        query_context = QueryContext([], "", 0, 0.0)
    elapsed_ms = (time.time() - start) * 1000

    context_text = pipeline._optimize_context(  # noqa: SLF001 — same package family
        query_context.chunks,
        state.get("context_limit") or pipeline.max_context_length,
    )
    messages = pipeline._build_messages(
        query=state["query"],
        context_text=context_text,
        history=state.get("history"),
        user_memory=state.get("user_memory"),
    )
    return {
        "query_context": query_context,
        "messages": messages,
        "retrieval_time_ms": elapsed_ms,
    }


async def _generate(state: ChatState) -> Dict[str, Any]:
    from langgraph.config import get_stream_writer

    writer = get_stream_writer()
    start = time.time()
    text_parts: List[str] = []
    # Count prompt tokens from the built prompt messages so streaming
    # billing carries real prompt_tokens
    prompt_tokens = 0
    provider_usage = None
    try:
        prompt_tokens = sum(
            count_tokens(m.get("content", "")) for m in state.get("messages", [])
        )
    except Exception:  # noqa: BLE001 — metrics best-effort
        pass
    try:
        llm = state["pipeline"].llm_client
        if hasattr(llm, "stream_with_usage"):
            async for token, usage in llm.stream_with_usage(
                state["messages"],
                temperature=state.get("temperature"),
                max_tokens=state.get("max_tokens"),
                model=state.get("model"),
            ):
                if usage:
                    provider_usage = usage
                if token:
                    text_parts.append(token)
                    if writer:
                        writer({"type": "token", "data": token})
        else:
            async for token in llm.stream(
                state["messages"],
                temperature=state.get("temperature"),
                max_tokens=state.get("max_tokens"),
                model=state.get("model"),
            ):
                if token:
                    text_parts.append(token)
                    if writer:
                        writer({"type": "token", "data": token})
    except Exception as exc:  # noqa: BLE001 — terminal error event, parity w/ legacy
        return {
            "error": str(exc),
            "generation_time_ms": (time.time() - start) * 1000,
            "token_count": count_tokens("".join(text_parts)),
            "prompt_tokens": prompt_tokens,
            "completion_tokens": count_tokens("".join(text_parts)),
        }

    response_text = "".join(text_parts)
    if provider_usage and provider_usage.get("prompt_tokens"):
        prompt_tokens = provider_usage["prompt_tokens"]
    if provider_usage and provider_usage.get("completion_tokens"):
        completion_tokens = provider_usage["completion_tokens"]
    else:
        completion_tokens = count_tokens(response_text)

    return {
        "response_text": response_text,
        "generation_time_ms": (time.time() - start) * 1000,
        "token_count": completion_tokens,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "error": None,
    }


def build_chat_graph():
    builder = StateGraph(ChatState)
    builder.add_node("retrieve", _retrieve)
    builder.add_node("generate", _generate)
    builder.set_entry_point("retrieve")
    builder.add_edge("retrieve", "generate")
    builder.add_edge("generate", END)
    return builder.compile()


class ChatGraphRunner:
    """Facade matching the two pipeline entrypoints used by ChatService."""

    def __init__(self, pipeline) -> None:
        self._pipeline = pipeline
        self._graph = build_chat_graph()

    # ── non-streaming ─────────────────────────────────────────────────────

    async def generate_response(self, **kwargs) -> QueryResponse:
        result = await self._graph.ainvoke(dict(pipeline=self._pipeline, **kwargs))
        query_context: QueryContext = result["query_context"]
        sources = _sources(query_context)
        r_ms = result["retrieval_time_ms"]
        g_ms = result["generation_time_ms"]

        # Capture prompt_tokens from the built prompt messages so billing is accurate.
        # Completion tokens counted from the response; total is the sum.
        usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        try:
            messages = result.get("messages", []) or []
            prompt_total = sum(
                count_tokens(m.get("content", "")) for m in messages
            )
            completion_total = count_tokens(result.get("response_text", "") or "")
            usage["prompt_tokens"] = prompt_total
            usage["completion_tokens"] = completion_total
            usage["total_tokens"] = prompt_total + completion_total
        except Exception:  # noqa: BLE001 — metrics best-effort, contract-shaped
            pass

        p_toks = usage["prompt_tokens"]
        c_toks = usage["completion_tokens"]
        tot_toks = usage["total_tokens"]

        metrics = {
            "retrieval_time_ms": r_ms,
            "generation_time_ms": g_ms,
            "total_time_ms": r_ms + g_ms,
            "sources_retrieved": len(sources),
            "avg_similarity": query_context.avg_similarity,
            "prompt_tokens": p_toks,
            "completion_tokens": c_toks,
            "total_tokens": tot_toks,
            "tokens_generated": c_toks,
        }
        response_text = (
            "I encountered an error generating a response."
            if result.get("error")
            else result["response_text"]
        )
        return QueryResponse(
            response=response_text,
            context=query_context,
            sources=sources,
            metrics=metrics,
        )

    # ── streaming (contract-identical to pipeline.stream_response) ───────

    async def stream_response(self, **kwargs) -> AsyncGenerator[Dict[str, Any], None]:
        inputs = dict(pipeline=self._pipeline, **kwargs)
        query_context: Optional[QueryContext] = None
        retrieval_ms = 0.0
        gen_out: Dict[str, Any] = {}

        async for mode, payload in self._graph.astream(
            inputs, stream_mode=["custom", "updates"]
        ):
            if mode == "updates":
                for node_out in (payload or {}).values():
                    if not node_out:
                        continue
                    if "query_context" in node_out:
                        query_context = node_out["query_context"]
                        retrieval_ms = node_out["retrieval_time_ms"]
                        sources = _sources(query_context)
                        yield {
                            "type": "sources",
                            "data": sources,
                            "metrics": {
                                "retrieval_time_ms": retrieval_ms,
                                "sources_retrieved": len(sources),
                                "avg_similarity": query_context.avg_similarity,
                            },
                        }
                    if "generation_time_ms" in node_out:
                        gen_out = node_out
            elif mode == "custom":
                yield payload

        if query_context is None or not gen_out:
            return

        if gen_out.get("error"):
            yield {"type": "error", "data": gen_out["error"], "is_final": True}
            return

        g_ms = gen_out["generation_time_ms"]
        p_toks = gen_out.get("prompt_tokens", 0)
        c_toks = gen_out.get("completion_tokens", gen_out.get("token_count", 0))
        tot_toks = p_toks + c_toks
        sources = _sources(query_context)

        yield {
            "type": "metrics",
            "data": {
                "retrieval_time_ms": retrieval_ms,
                "generation_time_ms": g_ms,
                "total_time_ms": retrieval_ms + g_ms,
                "prompt_tokens": p_toks,
                "completion_tokens": c_toks,
                "total_tokens": tot_toks,
                "tokens_generated": c_toks,
                "sources_retrieved": len(sources),
            },
            "is_final": True,
        }
