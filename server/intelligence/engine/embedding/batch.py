"""Batch processing for efficient embedding generation."""

import asyncio
from typing import List, Optional
import numpy as np
from dataclasses import dataclass

from engine.embedding.models import get_embedding_model
from core.logging import get_logger

logger = get_logger(__name__)


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

    def __init__(self, batch_size: int = 32, max_concurrent: int = 4):
        """
        Initialize batch processor.
        
        Args:
            batch_size: Number of texts per batch
            max_concurrent: Maximum concurrent batches
        """
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent
        self.model = get_embedding_model()

    async def process_batch(
        self,
        texts: List[str],
        batch_idx: int
    ) -> tuple[int, np.ndarray]:
        """
        Process a single batch.
        
        Args:
            texts: Texts in this batch
            batch_idx: Batch index for tracking
            
        Returns:
            Tuple of (batch_idx, embeddings)
        """
        try:
            embeddings = await self.model.encode_async(texts, self.batch_size)
            logger.debug(f"Batch {batch_idx}: processed {len(texts)} texts")
            return batch_idx, embeddings
        except Exception as e:
            logger.error(f"Error in batch {batch_idx}: {e}")
            raise

    async def process_all(
        self,
        texts: List[str],
        show_progress: bool = True
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
                total_time=0
            )

        # Split into batches
        batches = [
            texts[i:i + self.batch_size]
            for i in range(0, len(texts), self.batch_size)
        ]

        logger.info(
            f"Processing {len(texts)} texts in {len(batches)} batches "
            f"(batch_size={self.batch_size}, max_concurrent={self.max_concurrent})"
        )

        # Process batches with concurrency limit
        all_embeddings = []

        for i in range(0, len(batches), self.max_concurrent):
            batch_group = batches[i:i + self.max_concurrent]

            # Process concurrent batches
            tasks = [
                self.process_batch(batch, i + j)
                for j, batch in enumerate(batch_group)
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Check for errors
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Batch processing failed: {result}")
                    raise result

            # Collect embeddings in order
            for batch_idx, embeddings in sorted(results, key=lambda x: x[0]):
                all_embeddings.append(embeddings)

            if show_progress:
                processed = min((i + self.max_concurrent) * self.batch_size, len(texts))
                logger.info(f"Progress: {processed}/{len(texts)} texts embedded")

        # Concatenate all embeddings
        final_embeddings = np.vstack(all_embeddings)

        total_time = time.time() - start_time

        logger.info(
            f"Completed: {len(texts)} embeddings in {total_time:.2f}s "
            f"({len(texts)/total_time:.1f} texts/sec)"
        )

        return BatchResult(
            embeddings=final_embeddings,
            texts=texts,
            batch_size=self.batch_size,
            total_time=total_time
        )


async def batch_generate_embeddings(
    texts: List[str],
    batch_size: int = 32,
    max_concurrent: int = 4
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
