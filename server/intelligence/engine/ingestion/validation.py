"""Production-grade validation utilities for ingestion pipeline."""

import re
from urllib.parse import urlparse


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


def validate_url(url: str) -> str:
    """
    Validate and normalize URL.
    
    Args:
        url: URL to validate
        
    Returns:
        Normalized URL
        
    Raises:
        ValidationError: If URL is invalid
    """
    if not url or not isinstance(url, str):
        raise ValidationError("URL must be a non-empty string")

    url = url.strip()

    # Add scheme if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            raise ValidationError(f"Invalid URL: missing domain - {url}")
        if parsed.scheme not in ('http', 'https'):
            raise ValidationError(f"Invalid URL scheme: {parsed.scheme}")
        return url
    except Exception as e:
        raise ValidationError(f"Invalid URL: {e}")


def validate_content_length(content: str, max_length: int = 10_000_000) -> None:
    """
    Validate content length.
    
    Args:
        content: Content to validate
        max_length: Maximum allowed length in characters
        
    Raises:
        ValidationError: If content exceeds max length
    """
    if not isinstance(content, str):
        raise ValidationError("Content must be a string")

    if len(content) > max_length:
        raise ValidationError(
            f"Content too large: {len(content):,} chars (max: {max_length:,})"
        )


def validate_chunk_params(chunk_size: int, chunk_overlap: int) -> None:
    """
    Validate chunking parameters.
    
    Args:
        chunk_size: Chunk size in characters
        chunk_overlap: Overlap size in characters
        
    Raises:
        ValidationError: If parameters are invalid
    """
    if chunk_size < 50:
        raise ValidationError(f"Chunk size too small: {chunk_size} (min: 50)")

    if chunk_size > 10000:
        raise ValidationError(f"Chunk size too large: {chunk_size} (max: 10000)")

    if chunk_overlap < 0:
        raise ValidationError(f"Chunk overlap cannot be negative: {chunk_overlap}")

    if chunk_overlap >= chunk_size:
        raise ValidationError(
            f"Chunk overlap ({chunk_overlap}) must be less than chunk size ({chunk_size})"
        )


def validate_document_title(title: str, max_length: int = 500) -> str:
    """
    Validate and sanitize document title.
    
    Args:
        title: Document title
        max_length: Maximum title length
        
    Returns:
        Sanitized title
        
    Raises:
        ValidationError: If title is invalid
    """
    if not title or not isinstance(title, str):
        raise ValidationError("Title must be a non-empty string")

    title = title.strip()

    if not title:
        raise ValidationError("Title cannot be empty or whitespace only")

    if len(title) > max_length:
        title = title[:max_length].rsplit(' ', 1)[0] + '...'

    return title


def sanitize_metadata(metadata: dict) -> dict:
    """
    Sanitize metadata dictionary.
    
    Args:
        metadata: Metadata dictionary
        
    Returns:
        Sanitized metadata with string values only
    """
    if not isinstance(metadata, dict):
        return {}

    sanitized = {}
    for key, value in metadata.items():
        if isinstance(key, str) and key:
            # Convert value to string, limit length
            str_value = str(value)[:1000] if value is not None else ""
            sanitized[key] = str_value

    return sanitized


def validate_user_id(user_id: str) -> None:
    """
    Validate user ID.
    
    Args:
        user_id: User ID to validate
        
    Raises:
        ValidationError: If user ID is invalid
    """
    if not user_id or not isinstance(user_id, str):
        raise ValidationError("User ID must be a non-empty string")

    if len(user_id) > 255:
        raise ValidationError(f"User ID too long: {len(user_id)} (max: 255)")

    # Basic format validation (alphanumeric, hyphens, underscores)
    if not re.match(r'^[a-zA-Z0-9_-]+$', user_id):
        raise ValidationError(
            "User ID must contain only alphanumeric characters, hyphens, and underscores"
        )
