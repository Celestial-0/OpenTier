"""Ingestion pipeline module."""

from .chunker import TextChunk, TextChunker, chunk_text
from .processor import DocumentProcessor
from .storage import DocumentStorage, JobStorage
from .validation import ValidationError, validate_url, validate_content_length
from .retry import retry_async, with_retry, RetryError

# Scrapers
from .scrapers.web import WebScraper
from .scrapers.browser import BrowserScraper
from .scrapers.github import GitHubScraper

__all__ = [
    # Core classes
    "DocumentProcessor",
    "DocumentStorage",
    "JobStorage",
    # Chunking
    "TextChunk",
    "TextChunker",
    "chunk_text",
    # Validation
    "ValidationError",
    "validate_url",
    "validate_content_length",
    # Retry
    "RetryError",
    "retry_async",
    "with_retry",
    # Scrapers
    "WebScraper",
    "BrowserScraper",
    "GitHubScraper",
]
