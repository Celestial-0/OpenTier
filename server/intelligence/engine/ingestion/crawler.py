"""Web crawler for multi-page website scraping."""

import asyncio
from collections import deque
from typing import Optional
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

import httpx
from bs4 import BeautifulSoup

from core.logging import get_logger

logger = get_logger(__name__)


class WebCrawler:
    """Crawler for discovering and scraping multiple pages from a website."""

    def __init__(
        self,
        max_pages: int = 100,
        max_depth: int = 3,
        same_domain_only: bool = True,
        rate_limit_ms: int = 1000,
    ):
        """Initialize web crawler.
        
        Args:
            max_pages: Maximum number of pages to crawl
            max_depth: Maximum depth from start URL
            same_domain_only: Only crawl pages on same domain
            rate_limit_ms: Delay between requests in milliseconds
        """
        self.max_pages = max_pages
        self.max_depth = max_depth
        self.same_domain_only = same_domain_only
        self.rate_limit_ms = rate_limit_ms

        self.visited: set[str] = set()
        self.discovered: set[str] = set()
        self.queue: deque = deque()

        self.client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def crawl(self, start_url: str, follow_sitemap: bool = False) -> list[dict]:
        """Crawl website starting from given URL.
        
        Args:
            start_url: Starting URL
            follow_sitemap: Check sitemap.xml first
            
        Returns:
            List of discovered pages with metadata
        """
        self.visited.clear()
        self.discovered.clear()
        self.queue.clear()

        start_domain = self._get_domain(start_url)

        # Check sitemap first if requested
        if follow_sitemap:
            sitemap_urls = await self._get_sitemap_urls(start_url)
            if sitemap_urls:
                logger.info(f"Found {len(sitemap_urls)} URLs in sitemap")
                for url in sitemap_urls[:self.max_pages]:
                    if self.same_domain_only and self._get_domain(url) != start_domain:
                        continue
                    self.queue.append((url, 0))  # (url, depth)
                    self.discovered.add(url)

        # Add start URL if not already in queue
        if start_url not in self.discovered:
            self.queue.append((start_url, 0))
            self.discovered.add(start_url)

        pages = []

        while self.queue and len(pages) < self.max_pages:
            url, depth = self.queue.popleft()

            if url in self.visited:
                continue

            if depth > self.max_depth:
                continue

            try:
                # Rate limiting
                if self.rate_limit_ms > 0:
                    await asyncio.sleep(self.rate_limit_ms / 1000.0)

                # Fetch page
                response = await self.client.get(url)
                response.raise_for_status()

                self.visited.add(url)

                # Parse HTML
                soup = BeautifulSoup(response.text, 'lxml')

                # Extract page info
                page_info = {
                    'url': url,
                    'final_url': str(response.url),
                    'title': soup.title.string if soup.title else '',
                    'depth': depth,
                    'status_code': response.status_code,
                }

                pages.append(page_info)

                logger.info(f"Crawled [{len(pages)}/{self.max_pages}] {url} (depth: {depth})")

                # Discover new URLs if not at max depth
                if depth < self.max_depth:
                    new_urls = self._extract_links(soup, url, start_domain)
                    for new_url in new_urls:
                        if new_url not in self.discovered and new_url not in self.visited:
                            self.queue.append((new_url, depth + 1))
                            self.discovered.add(new_url)

            except Exception as e:
                logger.warning(f"Failed to crawl {url}: {e}")
                continue

        logger.info(f"Crawl complete: {len(pages)} pages crawled, {len(self.discovered)} discovered")
        return pages

    def _extract_links(self, soup: BeautifulSoup, base_url: str, start_domain: str) -> list[str]:
        """Extract links from HTML."""
        links = []

        for anchor in soup.find_all('a', href=True):
            href = anchor['href']

            # Skip anchors, mailto, tel, etc.
            if href.startswith(('#', 'mailto:', 'tel:', 'javascript:')):
                continue

            # Convert relative URLs to absolute
            absolute_url = urljoin(base_url, href)

            # Remove fragment
            absolute_url = absolute_url.split('#')[0]

            # Check domain restriction
            if self.same_domain_only:
                if self._get_domain(absolute_url) != start_domain:
                    continue

            # Skip non-HTTP(S) URLs
            if not absolute_url.startswith(('http://', 'https://')):
                continue

            # Skip common non-content files
            if any(absolute_url.lower().endswith(ext) for ext in [
                '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg',
                '.zip', '.tar', '.gz', '.mp4', '.mp3', '.css', '.js'
            ]):
                continue

            links.append(absolute_url)

        return links

    async def _get_sitemap_urls(self, base_url: str) -> list[str]:
        """Try to fetch URLs from sitemap.xml."""
        sitemap_urls = [
            urljoin(base_url, '/sitemap.xml'),
            urljoin(base_url, '/sitemap_index.xml'),
        ]

        for sitemap_url in sitemap_urls:
            try:
                response = await self.client.get(sitemap_url)
                if response.status_code == 200:
                    return self._parse_sitemap(response.text)
            except Exception:
                continue

        return []

    def _parse_sitemap(self, xml_content: str) -> list[str]:
        """Parse sitemap XML and extract URLs."""
        try:
            root = ElementTree.fromstring(xml_content)

            # Handle namespace
            namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

            urls = []
            for url_elem in root.findall('.//ns:url/ns:loc', namespace):
                if url_elem.text:
                    urls.append(url_elem.text)

            return urls
        except Exception as e:
            logger.warning(f"Failed to parse sitemap: {e}")
            return []

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        parsed = urlparse(url)
        return parsed.netloc

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
