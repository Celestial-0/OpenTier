"""LLM platform module (ports, catalog, gateway, embeddings)."""

from shared.llm.ports import (
    ChatModelGateway,
    EmbeddingGateway,
    ModelCatalog as ModelCatalogProtocol,
    ModelEntry,
    ProviderEntry,
)
from shared.llm.catalog import ModelCatalog, ModelNotConfigured
from shared.llm.embeddings import (
    HashedSparseEncoder,
    OpenAIEmbeddingGateway,
    build_embedding_gateway,
)
from shared.llm.gateway import (
    LangChainChatAdapter,
    ProviderError,
)

__all__ = [
    "ChatModelGateway",
    "EmbeddingGateway",
    "ModelCatalogProtocol",
    "ModelEntry",
    "ProviderEntry",
    "ModelCatalog",
    "ModelNotConfigured",
    "HashedSparseEncoder",
    "OpenAIEmbeddingGateway",
    "build_embedding_gateway",
    "LangChainChatAdapter",
    "ProviderError",
]

