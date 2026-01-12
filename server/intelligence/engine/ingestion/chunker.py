"""Text chunking utilities for document processing."""

import re
from dataclasses import dataclass
from typing import Any

from core.logging import get_logger
from engine.ingestion.validation import validate_chunk_params, validate_content_length

logger = get_logger(__name__)


@dataclass
class TextChunk:
    """Represents a chunk of text with metadata."""

    content: str
    index: int
    start_char: int
    end_char: int
    metadata: dict[str, Any]


class TextChunker:
    """
    Semantic text chunker with overlap.

    Chunks text while trying to preserve sentence boundaries and
    maintaining overlap between chunks for better context.
    """

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        separator: str = "\n\n",
    ):
        """
        Initialize chunker.

        Args:
            chunk_size: Target size for each chunk (in characters)
            chunk_overlap: Number of characters to overlap between chunks
            separator: Primary separator for splitting (default: paragraph)
            
        Raises:
            ValidationError: If chunk parameters are invalid
        """
        # Validate parameters
        validate_chunk_params(chunk_size, chunk_overlap)

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separator = separator

        logger.debug(
            f"Initialized TextChunker: chunk_size={chunk_size}, "
            f"chunk_overlap={chunk_overlap}"
        )

    def _split_by_sentences(self, text: str) -> list[str]:
        """Split text into sentences."""
        # Simple sentence splitter - splits on . ! ? followed by space
        sentences = re.split(r"([.!?]+\s+)", text)
        # Recombine sentences with their punctuation
        result = []
        for i in range(0, len(sentences) - 1, 2):
            if i + 1 < len(sentences):
                result.append(sentences[i] + sentences[i + 1])
            else:
                result.append(sentences[i])
        return [s for s in result if s.strip()]

    def _split_by_separator(self, text: str) -> list[str]:
        """Split text by separator."""
        parts = text.split(self.separator)
        return [p.strip() for p in parts if p.strip()]

    def chunk(self, text: str, metadata: dict[str, Any] | None = None) -> list[TextChunk]:
        """
        Chunk text into overlapping segments.

        Args:
            text: Text to chunk
            metadata: Optional metadata to attach to each chunk

        Returns:
            List of TextChunk objects
            
        Raises:
            ValidationError: If text is too large
        """
        if not text:
            logger.debug("Empty text provided to chunker, returning empty list")
            return []

        # Validate content length (max 10MB)
        try:
            validate_content_length(text, max_length=10_000_000)
        except Exception as e:
            logger.error(f"Content validation failed: {e}")
            raise

        if metadata is None:
            metadata = {}

        # First try to split by separator (paragraphs)
        parts = self._split_by_separator(text)
        if not parts:
            parts = [text]

        chunks: list[TextChunk] = []
        current_chunk = ""
        current_start = 0
        chunk_index = 0

        for part in parts:
            # If adding this part would exceed chunk size
            if len(current_chunk) + len(part) + len(self.separator) > self.chunk_size:
                # Save current chunk if it has content
                if current_chunk:
                    chunks.append(
                        TextChunk(
                            content=current_chunk.strip(),
                            index=chunk_index,
                            start_char=current_start,
                            end_char=current_start + len(current_chunk),
                            metadata=metadata.copy(),
                        )
                    )
                    chunk_index += 1

                    # Start new chunk with overlap
                    if self.chunk_overlap > 0 and len(current_chunk) > self.chunk_overlap:
                        overlap_text = current_chunk[-self.chunk_overlap :]
                        current_chunk = overlap_text + self.separator + part
                        current_start = current_start + len(current_chunk) - len(overlap_text) - len(self.separator) - len(part)
                    else:
                        current_chunk = part
                        current_start = current_start + len(current_chunk)
                else:
                    # Part is larger than chunk size, need to split it
                    if len(part) > self.chunk_size:
                        sentences = self._split_by_sentences(part)
                        for sentence in sentences:
                            if len(current_chunk) + len(sentence) > self.chunk_size:
                                if current_chunk:
                                    chunks.append(
                                        TextChunk(
                                            content=current_chunk.strip(),
                                            index=chunk_index,
                                            start_char=current_start,
                                            end_char=current_start + len(current_chunk),
                                            metadata=metadata.copy(),
                                        )
                                    )
                                    chunk_index += 1
                                current_chunk = sentence
                                current_start = current_start + len(sentence)
                            else:
                                current_chunk += " " + sentence if current_chunk else sentence
                    else:
                        current_chunk = part
                        current_start = current_start + len(part)
            else:
                # Add part to current chunk
                if current_chunk:
                    current_chunk += self.separator + part
                else:
                    current_chunk = part

        # Add final chunk
        if current_chunk:
            chunks.append(
                TextChunk(
                    content=current_chunk.strip(),
                    index=chunk_index,
                    start_char=current_start,
                    end_char=current_start + len(current_chunk),
                    metadata=metadata.copy(),
                )
            )

        return chunks


def chunk_text(
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    metadata: dict[str, Any] | None = None,
) -> list[TextChunk]:
    """
    Convenience function to chunk text.

    Args:
        text: Text to chunk
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks
        metadata: Optional metadata for chunks

    Returns:
        List of TextChunk objects
    """
    chunker = TextChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return chunker.chunk(text, metadata=metadata)
