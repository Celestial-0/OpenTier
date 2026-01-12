"""Web scraper for extracting content from URLs."""

import asyncio
from typing import Any

import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

from core.logging import get_logger
from engine.ingestion.retry import with_retry
from engine.ingestion.validation import ValidationError, validate_url

logger = get_logger(__name__)


class WebScraper:
    """Scrapes web pages and extracts content."""

    def __init__(self, timeout: int = 30, rate_limit_delay: float = 1.0):
        """Initialize web scraper.
        
        Args:
            timeout: Request timeout in seconds (default: 30)
            rate_limit_delay: Delay between requests in seconds (default: 1.0)
        """
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        self.last_request_time = 0.0

        logger.debug(f"Initialized WebScraper: timeout={timeout}s, rate_limit={rate_limit_delay}s")

    @with_retry(max_retries=3, base_delay=1.0)
    async def scrape(self, url: str) -> dict[str, Any]:
        """
        Scrape a URL and extract content with retry logic.

        Args:
            url: URL to scrape

        Returns:
            Dict with title, content, metadata
            
        Raises:
            ValidationError: If URL is invalid
            httpx.HTTPError: If request fails after retries
        """
        # Validate and normalize URL
        try:
            url = validate_url(url)
        except ValidationError as e:
            logger.error(f"Invalid URL: {e}")
            raise

        # Rate limiting
        await self._apply_rate_limit()

        logger.info(f"Scraping URL: {url}")

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

                logger.debug(f"Successfully fetched {url}: {response.status_code}")

                # Parse HTML
                soup = BeautifulSoup(response.text, "lxml")

                # Extract title
                title = self._extract_title(soup, url)

                # Extract main content
                content = self._extract_content(soup)

                # Extract metadata
                metadata = self._extract_metadata(soup, url)

                logger.info(f"Scraped {url}: {len(content):,} chars, title='{title}'")

                return {
                    "title": title,
                    "content": content,
                    "metadata": metadata,
                    "url": url,
                    "content_type": response.headers.get("content-type", ""),
                }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error scraping {url}: {e.response.status_code}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error scraping {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error scraping {url}: {e}", exc_info=True)
            raise

    async def _apply_rate_limit(self) -> None:
        """Apply rate limiting between requests."""
        import time

        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.rate_limit_delay:
            delay = self.rate_limit_delay - time_since_last
            logger.debug(f"Rate limiting: waiting {delay:.2f}s")
            await asyncio.sleep(delay)

        self.last_request_time = time.time()

    def _extract_title(self, soup: BeautifulSoup, url: str) -> str:
        """Extract page title."""
        # Try <title> tag
        if soup.title and soup.title.string:
            return soup.title.string.strip()

        # Try <h1> tag
        h1 = soup.find("h1")
        if h1:
            return h1.get_text().strip()

        # Try og:title meta tag
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            return og_title["content"].strip()

        # Fallback to URL
        parsed = urlparse(url)
        return parsed.netloc + parsed.path

    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Extract main content from page."""
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()

        # Try to find main content area
        main_content = None

        # Look for common content containers
        for selector in [
            "main",
            "article",
            '[role="main"]',
            ".content",
            ".main-content",
            "#content",
            "#main-content",
        ]:
            main_content = soup.select_one(selector)
            if main_content:
                break

        # If no main content found, use body
        if not main_content:
            main_content = soup.find("body")

        if not main_content:
            return ""

        # Get text content
        text = main_content.get_text(separator="\n", strip=True)

        # Clean up excessive whitespace
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n\n".join(lines)

    def _extract_metadata(self, soup: BeautifulSoup, url: str) -> dict[str, Any]:
        """Extract metadata from page."""
        metadata = {"source_url": url}

        # Extract description
        desc_meta = soup.find("meta", attrs={"name": "description"})
        if desc_meta and desc_meta.get("content"):
            metadata["description"] = desc_meta["content"].strip()

        # Extract og:description
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            metadata["og_description"] = og_desc["content"].strip()

        # Extract author
        author_meta = soup.find("meta", attrs={"name": "author"})
        if author_meta and author_meta.get("content"):
            metadata["author"] = author_meta["content"].strip()

        # Extract keywords
        keywords_meta = soup.find("meta", attrs={"name": "keywords"})
        if keywords_meta and keywords_meta.get("content"):
            metadata["keywords"] = keywords_meta["content"].strip()

        # Extract canonical URL
        canonical = soup.find("link", rel="canonical")
        if canonical and canonical.get("href"):
            metadata["canonical_url"] = canonical["href"]

        # Extract domain
        parsed = urlparse(url)
        metadata["domain"] = parsed.netloc

        return metadata
