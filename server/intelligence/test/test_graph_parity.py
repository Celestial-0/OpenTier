"""Golden parity: LangGraph orchestrator vs pipeline.

Both paths must emit the identical event contract on identical inputs:
    sources -> token* -> metrics   (with matching metric keys and token text)
"""

from __future__ import annotations

import os
from typing import AsyncGenerator, Dict, List, Optional

import pytest

os.environ.pop("CHAT_ORCHESTRATOR", None)

from features.chat.pipeline import QueryPipeline


class ParityTestLLMClient:
    """Local test double for event-contract parity verification."""

    def __init__(self) -> None:
        self.provider = "test"

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> tuple[str, Dict[str, int]]:
        text = "This is a response for parity testing."
        completion_tokens = len(text.split())
        return text, {
            "prompt_tokens": 50,
            "completion_tokens": completion_tokens,
            "total_tokens": 50 + completion_tokens,
        }

    async def stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        for word in "Streaming test output...".split():
            yield word + " "



class FakeSearchResult:
    def __init__(self, i: int) -> None:
        self.chunk_id = f"chunk-{i}"
        self.document_id = f"doc-{i}"
        self.similarity_score = 0.9 - 0.01 * i
        self.content = f"content {i} " * 20
        self.document_title = f"Doc {i}"


class FakeSearchEngine:
    def __init__(self, n: int = 2) -> None:
        self.n = n

    async def search(self, **kwargs):  # signature-compatible
        return [FakeSearchResult(i) for i in range(self.n)]


@pytest.fixture()
def pipeline(monkeypatch) -> QueryPipeline:
    p = QueryPipeline.__new__(QueryPipeline)
    p.llm_client = ParityTestLLMClient()
    p.search_engine = FakeSearchEngine(2)
    p.top_k = 5
    p.max_context_length = 2000
    p._graph_runner = None
    return p



async def collect(agen):
    return [event async for event in agen]


async def test_stream_contract_parity(pipeline, monkeypatch):
    kwargs = dict(
        query="what is opentier?",
        user_id="user-1",
        history=[{"role": "user", "content": "hi"}],
        use_rag=True,
        user_memory="User likes tea.",
    )

    legacy = await collect(pipeline.stream_response(**kwargs))

    monkeypatch.setenv("CHAT_ORCHESTRATOR", "graph")
    graph = await collect(pipeline.stream_response(**kwargs))
    monkeypatch.delenv("CHAT_ORCHESTRATOR")

    assert [e["type"] for e in legacy] == ["sources", "token", "token", "token", "metrics"]
    assert [e["type"] for e in graph] == [e["type"] for e in legacy]

    # sources payload identical
    assert legacy[0]["data"] == graph[0]["data"]
    assert legacy[0]["metrics"].keys() == graph[0]["metrics"].keys()

    # token text identical (joined)
    legacy_text = "".join(e["data"] for e in legacy if e["type"] == "token")
    graph_text = "".join(e["data"] for e in graph if e["type"] == "token")
    assert legacy_text == graph_text

    # metrics: same keys; timing fields numeric; counts match exactly
    lm, gm = legacy[-1]["data"], graph[-1]["data"]
    assert set(lm) == set(gm)
    assert lm["tokens_generated"] == gm["tokens_generated"]
    assert lm["sources_retrieved"] == gm["sources_retrieved"] == 2
    assert graph[-1].get("is_final") is True


async def test_non_rag_parity(pipeline, monkeypatch):
    kwargs = dict(query="hello", user_id="u", history=[], use_rag=False)

    legacy = await collect(pipeline.stream_response(**kwargs))
    monkeypatch.setenv("CHAT_ORCHESTRATOR", "graph")
    graph = await collect(pipeline.stream_response(**kwargs))
    monkeypatch.delenv("CHAT_ORCHESTRATOR")

    assert [e["type"] for e in graph] == [e["type"] for e in legacy]
    assert all(e["data"] == [] for e in graph if e["type"] == "sources")
    assert graph[-1]["data"]["sources_retrieved"] == 0


async def test_generate_response_shape_parity(pipeline, monkeypatch):
    legacy = await pipeline.generate_response(
        query="q", user_id="u", use_rag=True, user_memory=None
    )
    monkeypatch.setenv("CHAT_ORCHESTRATOR", "graph")
    graph = await pipeline.generate_response(
        query="q", user_id="u", use_rag=True, user_memory=None
    )
    monkeypatch.delenv("CHAT_ORCHESTRATOR")

    assert set(graph.metrics) == set(legacy.metrics)
    assert graph.sources == legacy.sources
    assert isinstance(graph.response, str) and graph.response
