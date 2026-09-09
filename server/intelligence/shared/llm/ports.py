"""Application-layer ports for models and LLM gateways."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import AsyncGenerator, Dict, List, Optional, Protocol, runtime_checkable


@dataclass(frozen=True)
class ProviderEntry:
    """A row from `model_providers` with provider configuration."""

    id: str
    slug: str
    base_url: str
    enabled: bool
    api_key: Optional[str] = None


@dataclass(frozen=True)
class ModelEntry:
    """A row from `models`: unit of routing, pricing, and capability."""

    id: str
    slug: str
    provider: ProviderEntry
    kind: str  # 'chat' | 'embedding'
    context_window: int
    max_output_tokens: Optional[int]
    dimensions: Optional[int]
    input_cost_per_mtok: float
    output_cost_per_mtok: float
    capabilities: Dict[str, bool] = field(default_factory=dict)
    fallback_slug: Optional[str] = None
    priority: int = 100
    enabled: bool = True


@runtime_checkable
class ChatModelGateway(Protocol):
    """Chat completion generation protocol."""

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> tuple[str, Dict[str, int]]: ...

    def stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]: ...


@runtime_checkable
class EmbeddingGateway(Protocol):
    """Batch embedding generation for texts."""

    async def embed_documents(self, texts: List[str]) -> List[List[float]]: ...

    async def embed_query(self, text: str) -> List[float]: ...


@runtime_checkable
class ModelCatalog(Protocol):
    """Resolution of model slugs to fully-hydrated entries with fallbacks."""

    async def resolve_chat(
        self, slug: Optional[str] = None
    ) -> tuple[ModelEntry, List[ModelEntry]]:
        """Returns (primary, fallback_chain) — primary first."""
        ...

    async def default_embedding(self) -> ModelEntry: ...
