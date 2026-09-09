"""Text cleaning module."""

from .cleaner import (
    CleaningMetrics,
    CleaningStrategy,
    DocumentType,
    clean_code,
    clean_markdown,
    clean_pdf_text,
    clean_text,
    clean_url_content,
    clean_with_strategy,
    normalize_whitespace,
    remove_boilerplate,
    strip_html,
)

__all__ = [
    # Types
    "DocumentType",
    "CleaningStrategy",
    "CleaningMetrics",
    # Main functions
    "clean_with_strategy",
    "clean_text",
    # Type-specific cleaners
    "clean_url_content",
    "clean_markdown",
    "clean_code",
    "clean_pdf_text",
    # Utilities
    "strip_html",
    "normalize_whitespace",
    "remove_boilerplate",
]
