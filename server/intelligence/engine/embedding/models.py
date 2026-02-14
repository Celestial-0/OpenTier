"""Embedding models and generation service.

This module provides high-performance embedding generation using e5-small model
for fast retrieval with minimal latency.
"""

import asyncio
from typing import List, Optional
import numpy as np

from functools import lru_cache

from sentence_transformers import SentenceTransformer
import torch

from core.logging import get_logger
from core.config import get_config, EmbeddingConfig

logger = get_logger(__name__)


class EmbeddingModel:
    """
    High-performance embedding model.

    Features:
    - Fast inference on CPU/GPU
    - 384 dimensions
    - Batch processing for efficiency
    - In-memory caching
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None):
        """
        Initialize embedding model.

        Args:
            config: Optional embedding configuration
        """
        self.config = config or get_config().embedding
        self.model: Optional[SentenceTransformer] = None
        self._cache: dict[str, np.ndarray] = {}

        # Determine device: explicit config > auto-detect
        if self.config.device:
            self.device = self.config.device
        else:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info(
            f"Initializing embedding model: {self.config.model_name} on {self.device}"
        )

    def load(self) -> None:
        """Load the embedding model into memory."""
        if self.model is not None:
            logger.debug("Model already loaded")
            return

        try:
            self.model = SentenceTransformer(self.config.model_name, device=self.device)

            # Optimize for inference
            self.model.eval()
            if self.device == "cuda":
                self.model.half()  # Use FP16 for faster GPU inference

            logger.info(
                f"Loaded {self.config.model_name}: "
                f"{self.config.dimensions} dims, device={self.device}"
            )
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise

    def encode(
        self,
        texts: List[str],
        batch_size: Optional[int] = None,
        show_progress: bool = False,
    ) -> np.ndarray:
        """
        Generate embeddings for texts.

        Args:
            texts: List of texts to embed
            batch_size: Optional batch size (default: config.batch_size)
            show_progress: Show progress bar

        Returns:
            Array of embeddings (n_texts, dimensions)
        """
        if self.model is None:
            self.load()

        if not texts:
            return np.array([])

        batch_size = batch_size or self.config.batch_size

        # BGE models don't need prefix for passages (only for queries)
        # Just use the texts as-is for document encoding

        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=show_progress,
                normalize_embeddings=self.config.normalize,
                convert_to_numpy=True,
            )

            logger.debug(f"Generated {len(embeddings)} embeddings")
            return embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            raise

    def encode_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a search query.

        Args:
            query: Search query text

        Returns:
            Query embedding vector
        """
        if self.model is None:
            self.load()

        # Check cache
        if query in self._cache:
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return self._cache[query]

        # Add instruction prefix for BGE models
        # BGE expects: "Represent this sentence for searching relevant passages: {query}"
        prefixed_query = f"{self.config.query_instruction}{query}"

        try:
            embedding = self.model.encode(
                [prefixed_query],
                normalize_embeddings=self.config.normalize,
                convert_to_numpy=True,
            )[0]

            # Cache the result
            if len(self._cache) < self.config.cache_size:
                self._cache[query] = embedding

            logger.debug(f"Generated query embedding: {len(embedding)} dims")
            return embedding

        except Exception as e:
            logger.error(f"Error generating query embedding: {e}")
            raise

    async def encode_async(
        self, texts: List[str], batch_size: Optional[int] = None
    ) -> np.ndarray:
        """
        Async wrapper for embedding generation.

        Args:
            texts: List of texts to embed
            batch_size: Optional batch size

        Returns:
            Array of embeddings
        """
        # Run in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.encode, texts, batch_size, False)

    async def encode_query_async(self, query: str) -> np.ndarray:
        """
        Async wrapper for query embedding generation.

        Args:
            query: Search query

        Returns:
            Query embedding
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.encode_query, query)

    def clear_cache(self) -> None:
        """Clear the embedding cache."""
        self._cache.clear()
        logger.info("Cleared embedding cache")

    def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        return {
            "size": len(self._cache),
            "max_size": self.config.cache_size,
            "utilization": len(self._cache) / self.config.cache_size,
        }


# Global model instance (lazy loaded)
_model_instance: Optional[EmbeddingModel] = None


def get_embedding_model() -> EmbeddingModel:
    """
    Get the global embedding model instance.

    Returns:
        Singleton embedding model
    """
    global _model_instance

    if _model_instance is None:
        _model_instance = EmbeddingModel(get_config().embedding)
        _model_instance.load()

    return _model_instance


async def generate_embeddings(texts: List[str]) -> np.ndarray:
    """
    Generate embeddings for a list of texts.

    Args:
        texts: List of texts to embed

    Returns:
        Array of embeddings
    """
    model = get_embedding_model()
    return await model.encode_async(texts)


async def generate_query_embedding(query: str) -> np.ndarray:
    """
    Generate embedding for a search query.

    Args:
        query: Search query

    Returns:
        Query embedding
    """
    model = get_embedding_model()
    return await model.encode_query_async(query)
