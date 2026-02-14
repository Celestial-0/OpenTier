"""Text cleaning utilities for document processing."""

import re
import unicodedata
from dataclasses import dataclass
from enum import Enum
from html.parser import HTMLParser
from typing import Optional

from core.logging import get_logger

logger = get_logger(__name__)


class DocumentType(Enum):
    """Document types for type-specific cleaning."""

    TEXT = "text"
    MARKDOWN = "markdown"
    HTML = "html"
    PDF = "pdf"
    CODE = "code"
    URL = "url"  # Web-scraped content


class CleaningStrategy(Enum):
    """Cleaning strategy levels."""

    MINIMAL = "minimal"  # Only normalize line endings and unicode
    STANDARD = "standard"  # Default production-grade cleaning
    AGGRESSIVE = "aggressive"  # Maximum cleaning, may lose some formatting


@dataclass
class CleaningMetrics:
    """Metrics tracking cleaning effectiveness."""

    original_length: int
    cleaned_length: int
    chars_removed: int
    html_tags_removed: int
    whitespace_normalized: bool
    unicode_normalized: bool
    boilerplate_removed: bool

    @property
    def reduction_percent(self) -> float:
        """Calculate percentage of content removed."""
        if self.original_length == 0:
            return 0.0
        return (self.chars_removed / self.original_length) * 100


class HTMLStripper(HTMLParser):
    """HTML tag stripper."""

    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = []

    def handle_data(self, data):
        self.text.append(data)

    def get_text(self):
        return "".join(self.text)


def strip_html(text: str) -> str:
    """Remove HTML tags from text.

    Args:
        text: HTML text to clean

    Returns:
        Text with HTML tags removed
    """
    if not text:
        return ""

    try:
        stripper = HTMLStripper()
        stripper.feed(text)
        return stripper.get_text()
    except Exception as e:
        logger.warning(f"Error stripping HTML, returning original text: {e}")
        return text


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text."""
    # Replace multiple spaces with single space
    text = re.sub(r" +", " ", text)
    # Replace multiple newlines with double newline
    text = re.sub(r"\n\n+", "\n\n", text)
    # Remove trailing whitespace from lines
    text = "\n".join(line.rstrip() for line in text.split("\n"))
    return text.strip()


def normalize_unicode(text: str) -> str:
    """Normalize unicode characters."""
    # Normalize to NFC form (canonical composition)
    text = unicodedata.normalize("NFC", text)
    return text


def remove_special_chars(text: str, keep_punctuation: bool = True) -> str:
    """Remove special characters from text."""
    if keep_punctuation:
        # Keep letters, numbers, whitespace, and basic punctuation
        pattern = r"[^\w\s.,!?;:()\-\"']"
    else:
        # Keep only letters, numbers, and whitespace
        pattern = r"[^\w\s]"

    return re.sub(pattern, "", text)


def normalize_line_endings(text: str) -> str:
    """Normalize line endings to \n."""
    # Replace Windows (\r\n) and old Mac (\r) line endings with Unix (\n)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text


def remove_boilerplate(html: str) -> str:
    """
    Remove common web boilerplate elements (navigation, footer, ads, etc.).

    This is a production-grade approach for cleaning web-scraped content.
    """
    if not html:
        return ""

    # Common boilerplate patterns to remove
    boilerplate_patterns = [
        # Navigation elements
        r"<nav[^>]*>.*?</nav>",
        r"<header[^>]*>.*?</header>",
        r"<footer[^>]*>.*?</footer>",
        # Ads and tracking
        r'<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?</div>',
        r'<div[^>]*id="[^"]*ad[^"]*"[^>]*>.*?</div>',
        r"<script[^>]*>.*?</script>",
        r"<noscript[^>]*>.*?</noscript>",
        # Social media widgets
        r'<div[^>]*class="[^"]*social[^"]*"[^>]*>.*?</div>',
        r'<div[^>]*class="[^"]*share[^"]*"[^>]*>.*?</div>',
        # Comments sections
        r'<div[^>]*class="[^"]*comment[^"]*"[^>]*>.*?</div>',
        r'<div[^>]*id="[^"]*comment[^"]*"[^>]*>.*?</div>',
        # Common sidebar elements
        r"<aside[^>]*>.*?</aside>",
        r'<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>.*?</div>',
    ]

    cleaned = html
    for pattern in boilerplate_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.DOTALL | re.IGNORECASE)

    return cleaned


def clean_markdown(text: str, preserve_formatting: bool = True) -> str:
    """
    Clean markdown content while preserving structure.

    Args:
        text: Markdown text
        preserve_formatting: Keep markdown formatting (links, emphasis, etc.)

    Returns:
        Cleaned markdown text
    """
    if not text:
        return ""

    # Normalize line endings
    text = normalize_line_endings(text)

    if not preserve_formatting:
        # Strip markdown syntax if not preserving
        text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)  # Links
        text = re.sub(r"[*_]{1,2}([^*_]+)[*_]{1,2}", r"\1", text)  # Bold/italic
        text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)  # Headers
        text = re.sub(r"`([^`]+)`", r"\1", text)  # Inline code

    # Remove excessive blank lines (more than 2)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Normalize whitespace
    text = normalize_whitespace(text)

    return text


def clean_code(text: str, language: Optional[str] = None) -> str:
    """
    Clean code content while preserving syntax.

    Args:
        text: Code text
        language: Programming language (optional)

    Returns:
        Cleaned code text
    """
    if not text:
        return ""

    # Normalize line endings
    text = normalize_line_endings(text)

    # Remove excessive blank lines but preserve code structure
    text = re.sub(r"\n{4,}", "\n\n\n", text)

    # Remove trailing whitespace from lines (common code cleanup)
    text = "\n".join(line.rstrip() for line in text.split("\n"))

    # Normalize unicode but don't touch whitespace (important for code)
    text = normalize_unicode(text)

    return text.strip()


def clean_url_content(html: str, aggressive: bool = False) -> str:
    """
    Clean web-scraped URL content (HTML).

    This is optimized for web scraping scenarios where you want
    to extract meaningful content from HTML pages.

    Args:
        html: HTML content from URL
        aggressive: If True, apply aggressive boilerplate removal

    Returns:
        Cleaned text content
    """
    if not html:
        return ""

    # Remove boilerplate if aggressive
    if aggressive:
        html = remove_boilerplate(html)

    # Strip HTML tags
    text = strip_html(html)

    # Normalize unicode
    text = normalize_unicode(text)

    # Normalize whitespace
    text = normalize_whitespace(text)

    return text


def clean_pdf_text(text: str) -> str:
    """
    Clean text extracted from PDF.

    PDFs often have artifacts from extraction like hyphenation,
    page numbers, headers/footers.
    """
    if not text:
        return ""

    # Normalize line endings
    text = normalize_line_endings(text)

    # Remove common PDF artifacts
    # Remove page numbers (standalone numbers on lines)
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)

    # Fix hyphenation at line breaks
    text = re.sub(r"-\n(\w)", r"\1", text)

    # Normalize unicode
    text = normalize_unicode(text)

    # Normalize whitespace
    text = normalize_whitespace(text)

    return text


def clean_text(
    text: str,
    *,
    strip_html_tags: bool = False,
    normalize_ws: bool = True,
    normalize_uni: bool = True,
    remove_special: bool = False,
    keep_punctuation: bool = True,
) -> str:
    """
    Clean text with various options.

    Args:
        text: Input text to clean
        strip_html_tags: Remove HTML tags
        normalize_ws: Normalize whitespace
        normalize_uni: Normalize unicode characters
        remove_special: Remove special characters
        keep_punctuation: Keep punctuation when removing special chars

    Returns:
        Cleaned text
    """
    if not text:
        return ""

    # Normalize line endings first
    text = normalize_line_endings(text)

    # Strip HTML if requested
    if strip_html_tags:
        text = strip_html(text)

    # Normalize unicode
    if normalize_uni:
        text = normalize_unicode(text)

    # Remove special characters
    if remove_special:
        text = remove_special_chars(text, keep_punctuation=keep_punctuation)

    # Normalize whitespace last
    if normalize_ws:
        text = normalize_whitespace(text)

    return text


def clean_with_strategy(
    text: str,
    document_type: DocumentType,
    strategy: CleaningStrategy = CleaningStrategy.STANDARD,
) -> tuple[str, CleaningMetrics]:
    """
    Production-grade cleaning with document-type-specific strategies.

    This is the main entry point for intelligent, resource-aware cleaning.

    Args:
        text: Input text to clean
        document_type: Type of document (URL, Markdown, Code, etc.)
        strategy: Cleaning strategy level

    Returns:
        Tuple of (cleaned_text, metrics)

    Examples:
        >>> text, metrics = clean_with_strategy(html, DocumentType.HTML, CleaningStrategy.STANDARD)
        >>> print(f"Removed {metrics.reduction_percent:.1f}% of content")
    """
    if not text:
        return "", CleaningMetrics(
            original_length=0,
            cleaned_length=0,
            chars_removed=0,
            html_tags_removed=0,
            whitespace_normalized=False,
            unicode_normalized=False,
            boilerplate_removed=False,
        )

    original_length = len(text)
    cleaned = text
    html_tags_removed = 0
    boilerplate_removed = False

    # Apply document-type-specific cleaning
    if document_type == DocumentType.HTML or document_type == DocumentType.URL:
        # Web content cleaning
        if strategy == CleaningStrategy.AGGRESSIVE:
            # Remove boilerplate first
            before_boilerplate = len(cleaned)
            cleaned = remove_boilerplate(cleaned)
            boilerplate_removed = len(cleaned) < before_boilerplate

        # Count HTML tags before removal
        html_tags_removed = len(re.findall(r"<[^>]+>", cleaned))
        cleaned = clean_url_content(
            cleaned, aggressive=(strategy == CleaningStrategy.AGGRESSIVE)
        )

    elif document_type == DocumentType.MARKDOWN:
        # Markdown cleaning
        preserve_formatting = strategy != CleaningStrategy.AGGRESSIVE
        cleaned = clean_markdown(cleaned, preserve_formatting=preserve_formatting)

    elif document_type == DocumentType.CODE:
        # Code cleaning (minimal, preserve structure)
        cleaned = clean_code(cleaned)

    elif document_type == DocumentType.PDF:
        # PDF text cleaning
        cleaned = clean_pdf_text(cleaned)

    elif document_type == DocumentType.TEXT:
        # Plain text cleaning
        if strategy == CleaningStrategy.MINIMAL:
            cleaned = normalize_line_endings(cleaned)
            cleaned = normalize_unicode(cleaned)
        elif strategy == CleaningStrategy.STANDARD:
            cleaned = clean_text(cleaned, normalize_ws=True, normalize_uni=True)
        else:  # AGGRESSIVE
            cleaned = clean_text(
                cleaned,
                normalize_ws=True,
                normalize_uni=True,
                remove_special=True,
                keep_punctuation=True,
            )

    # Calculate metrics
    cleaned_length = len(cleaned)
    chars_removed = original_length - cleaned_length

    metrics = CleaningMetrics(
        original_length=original_length,
        cleaned_length=cleaned_length,
        chars_removed=chars_removed,
        html_tags_removed=html_tags_removed,
        whitespace_normalized=True,
        unicode_normalized=True,
        boilerplate_removed=boilerplate_removed,
    )

    return cleaned, metrics
