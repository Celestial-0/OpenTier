"""Embedding module for vector generation and management."""

from .models import (
    EmbeddingModel,
    EmbeddingConfig,
    get_embedding_model,
    generate_embeddings,
    generate_query_embedding,
)
from .batch import batch_generate_embeddings

__all__ = [
    "EmbeddingModel",
    "EmbeddingConfig",
    "get_embedding_model",
    "generate_embeddings",
    "generate_query_embedding",
    "batch_generate_embeddings",
]
