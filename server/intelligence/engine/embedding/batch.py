"""Batch processing for efficient embedding generation."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional
import numpy as np
from dataclasses import dataclass

from engine.embedding.models import get_embedding_model
from core.logging import get_logger

logger = get_logger(__name__)

# Dedicated single-thread executor for CPU-bound embedding work.
# Using a separate executor prevents contention with the default asyncio thread pool
# and avoids deadlocks on Windows when processing large batches.
_EMBEDDING_EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="embedding")


@dataclass
class BatchResult:
    """Result from batch embedding generation."""

    embeddings: np.ndarray
    texts: List[str]
    batch_size: int
    total_time: float

    @property
    def avg_time_per_item(self) -> float:
        """Average time per item in seconds."""
        return self.total_time / len(self.texts) if self.texts else 0


class BatchEmbeddingProcessor:
    """
    Processes embeddings in batches for efficiency.

    Features:
    - Automatic batching
    - Progress tracking
    - Error handling per batch
    - Concurrent batch processing
    """

    def __init__(self, batch_size: int = 32, max_concurrent: int = 1):
        """
        Initialize batch processor.

        Args:
            batch_size: Number of texts per batch
            max_concurrent: Maximum concurrent batches (defaults to 1 for CPU, 4 for GPU)
        """
        self.batch_size = batch_size
        self.model = get_embedding_model()

        # Set smart default for concurrency
        if max_concurrent is not None:
            self.max_concurrent = max_concurrent
        else:
            # CPU intensive tasks should run sequentially or with very low concurrency
            # to avoid thread contention and thrashing.
            self.max_concurrent = 4 if self.model.device == "cuda" else 1

        logger.debug(
            f"Initialized BatchEmbeddingProcessor: batch_size={batch_size}, max_concurrent={self.max_concurrent}"
        )

    async def process_batch(
        self, texts: List[str], batch_idx: int
    ) -> tuple[int, np.ndarray]:
        """
        Process a single batch using the dedicated embedding executor.

        Args:
            texts: Texts in this batch
            batch_idx: Batch index for tracking

        Returns:
            Tuple of (batch_idx, embeddings)
        """
        try:
            loop = asyncio.get_event_loop()
            # Use dedicated executor to avoid thread pool contention
            embeddings = await loop.run_in_executor(
                _EMBEDDING_EXECUTOR,
                self.model.encode,
                texts,
                self.batch_size,
                False,
            )
            logger.debug(f"Batch {batch_idx}: processed {len(texts)} texts")
            return batch_idx, embeddings
        except Exception as e:
            logger.error(f"Error in batch {batch_idx}: {e}")
            raise

    async def process_all(
        self, texts: List[str], show_progress: bool = True
    ) -> BatchResult:
        """
        Process all texts in batches.

        Args:
            texts: All texts to embed
            show_progress: Show progress logging

        Returns:
            BatchResult with all embeddings
        """
        import time

        start_time = time.time()

        if not texts:
            return BatchResult(
                embeddings=np.array([]),
                texts=[],
                batch_size=self.batch_size,
                total_time=0,
            )

        # Split into batches
        batches = [
            texts[i : i + self.batch_size]
            for i in range(0, len(texts), self.batch_size)
        ]

        logger.info(
            f"Processing {len(texts)} texts in {len(batches)} batches "
            f"(batch_size={self.batch_size}, max_concurrent={self.max_concurrent})"
        )

        # Process batches SEQUENTIALLY to prevent thread pool exhaustion on Windows.
        # asyncio.gather with run_in_executor can saturate the thread pool and deadlock
        # on Windows when running CPU-intensive tasks. Sequential processing is safer
        # and only marginally slower for single-GPU/CPU workloads.
        all_embeddings = []

        for i, batch in enumerate(batches):
            try:
                _, embeddings = await self.process_batch(batch, i)
                all_embeddings.append(embeddings)
            except Exception as e:
                logger.error(f"Batch {i} processing failed: {e}")
                raise

            if show_progress:
                processed = min((i + 1) * self.batch_size, len(texts))
                logger.info(f"Progress: {processed}/{len(texts)} texts embedded")

        # Concatenate all embeddings
        final_embeddings = np.vstack(all_embeddings)

        total_time = time.time() - start_time

        logger.info(
            f"Completed: {len(texts)} embeddings in {total_time:.2f}s "
            f"({len(texts) / total_time:.1f} texts/sec)"
        )

        return BatchResult(
            embeddings=final_embeddings,
            texts=texts,
            batch_size=self.batch_size,
            total_time=total_time,
        )


async def batch_generate_embeddings(
    texts: List[str], batch_size: int = 32, max_concurrent: int | None = None
) -> np.ndarray:
    """
    Generate embeddings for texts in batches.

    Args:
        texts: List of texts to embed
        batch_size: Batch size
        max_concurrent: Max concurrent batches

    Returns:
        Array of embeddings
    """
    processor = BatchEmbeddingProcessor(batch_size, max_concurrent)
    result = await processor.process_all(texts)
    return result.embeddings
