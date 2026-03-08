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

        # If no punctuation matches, re.split returns a 1-element list
        if len(sentences) == 1:
            return [text.strip()] if text.strip() else []

        # Recombine sentences with their punctuation
        result = []
        for i in range(0, len(sentences) - 1, 2):
            result.append(sentences[i] + sentences[i + 1])

        # Add the last segment if there's any text after the last punctuation
        if len(sentences) % 2 != 0 and sentences[-1].strip():
            result.append(sentences[-1])

        return [s for s in result if s.strip()]

    def _split_by_separator(self, text: str) -> list[str]:
        """Split text by separator."""
        parts = text.split(self.separator)
        return [p.strip() for p in parts if p.strip()]

    def chunk(
        self, text: str, metadata: dict[str, Any] | None = None
    ) -> list[TextChunk]:
        """
        Chunk text into overlapping segments semantically.

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

        # 1. Split by primary separator (paragraphs)
        parts = self._split_by_separator(text)
        if not parts:
            parts = [text]

        # 2. Break down parts that are too large into sub-parts
        parts_to_process = []
        for part in parts:
            if len(part) > self.chunk_size:
                sentences = self._split_by_sentences(part)
                for s in sentences:
                    if len(s) > self.chunk_size:
                        # Hard character-level split for extremely long "sentences"
                        # We use a slightly smaller step to allow for some overlap room later
                        step = self.chunk_size - self.chunk_overlap
                        if step <= 0:
                            step = self.chunk_size // 2  # Safety
                        for i in range(0, len(s), step):
                            parts_to_process.append(s[i : i + step])
                    else:
                        parts_to_process.append(s)
            else:
                parts_to_process.append(part)

        chunks: list[TextChunk] = []
        current_content = ""
        current_offset = 0  # This offset tracking is difficult across splits, usually tracked by index
        chunk_index = 0

        # 3. Assemble sub-parts into chunks up to chunk_size
        for p in parts_to_process:
            # Separator between sub-parts (use space or newline)
            sep = (
                self.separator
                if current_content and not current_content.endswith(self.separator)
                else ""
            )

            # Potential chunk if we add this part
            merged = (current_content + sep + p) if current_content else p

            if len(merged) > self.chunk_size:
                # Flush the current content
                if current_content:
                    content_to_save = current_content.strip()
                    chunks.append(
                        TextChunk(
                            content=content_to_save,
                            index=chunk_index,
                            start_char=current_offset,
                            end_char=current_offset + len(content_to_save),
                            metadata=metadata.copy(),
                        )
                    )
                    chunk_index += 1

                    # Estimate next offset (non-critical, usually for UI hits)
                    current_offset += len(content_to_save)

                    # Manage overlap for the next chunk
                    overlap = ""
                    if (
                        self.chunk_overlap > 0
                        and len(current_content) > self.chunk_overlap
                    ):
                        overlap = current_content[-self.chunk_overlap :]

                    # New content starts with overlap + separator + current part p
                    sep = (
                        self.separator
                        if overlap and not overlap.endswith(self.separator)
                        else ""
                    )
                    current_content = (overlap + sep + p) if overlap else p
                else:
                    # Individual part P is too large for an empty chunk?
                    # (Should not happen due to parts_to_process logic, but safety)
                    current_content = p
            else:
                current_content = merged

        # Final flush
        if current_content.strip():
            content_to_save = current_content.strip()
            chunks.append(
                TextChunk(
                    content=content_to_save,
                    index=chunk_index,
                    start_char=current_offset,
                    end_char=current_offset + len(content_to_save),
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
