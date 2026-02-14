"""Headless browser scraper for JavaScript-heavy websites."""

import asyncio
import re
from typing import Optional

from playwright.async_api import (
    async_playwright,
    Browser,
    Page,
    TimeoutError as PlaywrightTimeout,
)

from core.logging import get_logger

logger = get_logger(__name__)


class BrowserScraper:
    """Scraper using headless browser for JavaScript-rendered sites."""

    def __init__(self):
        """Initialize browser scraper."""
        self.playwright = None
        self.browser: Optional[Browser] = None

    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def start(self):
        """Start browser instance."""
        if not self.playwright:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            logger.info("Browser instance started")

    async def close(self):
        """Close browser instance."""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
            logger.info("Browser instance closed")

    async def scrape(
        self,
        url: str,
        wait_for: str = "networkidle",
        timeout_ms: int = 300000,
        screenshot: bool = False,
        scroll_to_bottom: bool = True,
    ) -> dict:
        """Scrape URL using headless browser.

        Args:
            url: URL to scrape
            wait_for: Wait strategy ('load', 'domcontentloaded', 'networkidle')
            timeout_ms: Timeout in milliseconds
            screenshot: Whether to capture screenshot
            scroll_to_bottom: Automatically scroll to bottom to load all content

        Returns:
            Dictionary with title, content, and metadata
        """
        if not self.browser:
            await self.start()

        page: Page = await self.browser.new_page()

        try:
            logger.info(f"Navigating to {url} with browser")

            # Navigate to URL
            await page.goto(url, wait_until=wait_for, timeout=timeout_ms)

            # Wait for page to fully load before scrolling
            await asyncio.sleep(2)

            # Scroll to bottom to load all lazy-loaded content
            if scroll_to_bottom:
                logger.info("Scrolling to bottom to load all content")

                # Get initial scroll height
                prev_height = await page.evaluate("document.body.scrollHeight")

                # Scroll down in steps to trigger lazy loading
                for i in range(10):  # Scroll up to 10 times
                    # Scroll by viewport height
                    await page.evaluate("window.scrollBy(0, window.innerHeight)")
                    await asyncio.sleep(0.8)  # Wait for content to load

                    # Check if we've reached the bottom
                    new_height = await page.evaluate("document.body.scrollHeight")
                    if new_height == prev_height:
                        break  # No more content loading
                    prev_height = new_height

                # Final scroll to absolute bottom
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(1.5)  # Wait for final lazy loads

                # Scroll back to top for consistent extraction
                await page.evaluate("window.scrollTo(0, 0)")
                await asyncio.sleep(0.5)

                logger.info(f"Scrolling complete - final height: {prev_height}px")

            # Final wait for any delayed content
            await asyncio.sleep(1)

            # Extract content
            title = await page.title()
            content = await page.content()

            # Extract text content - use textContent to get ALL text
            text_content = await page.evaluate("""() => {
                // Remove script, style, and noscript elements
                const unwanted = document.querySelectorAll('script, style, noscript, iframe');
                unwanted.forEach(el => el.remove());
                
                // Use textContent to get all text (including hidden/formatted)
                return document.body.textContent || document.body.innerText || '';
            }""")

            # Clean up the text - remove excessive whitespace
            text_content = re.sub(r"\s+", " ", text_content).strip()

            metadata = {
                "url": url,
                "final_url": page.url,  # May differ if redirected
                "type": "html",
                "scraper": "browser",
                "scrolled": scroll_to_bottom,
            }

            # Optional screenshot
            if screenshot:
                screenshot_bytes = await page.screenshot(full_page=True)
                metadata["screenshot_size"] = len(screenshot_bytes)

            logger.info(
                f"Successfully scraped {url} with browser ({len(text_content)} chars)"
            )

            return {
                "title": title,
                "content": text_content,
                "html": content,
                "url": url,
                "metadata": metadata,
            }

        except PlaywrightTimeout:
            logger.error(f"Timeout scraping {url}")
            raise
        except Exception as e:
            logger.error(f"Error scraping {url} with browser: {e}")
            raise
        finally:
            await page.close()

    async def scrape_with_interaction(
        self, url: str, actions: list[dict], timeout_ms: int = 30000
    ) -> dict:
        """Scrape URL with custom interactions (clicks, scrolls, etc).

        Args:
            url: URL to scrape
            actions: List of actions to perform (e.g., [{'type': 'click', 'selector': '#button'}])
            timeout_ms: Timeout in milliseconds

        Returns:
            Dictionary with title, content, and metadata
        """
        if not self.browser:
            await self.start()

        page: Page = await self.browser.new_page()

        try:
            await page.goto(url, timeout=timeout_ms)

            # Perform actions
            for action in actions:
                action_type = action.get("type")

                if action_type == "click":
                    await page.click(action["selector"])
                elif action_type == "scroll":
                    await page.evaluate(
                        "window.scrollTo(0, document.body.scrollHeight)"
                    )
                elif action_type == "wait":
                    await asyncio.sleep(action.get("seconds", 1))
                elif action_type == "wait_for_selector":
                    await page.wait_for_selector(
                        action["selector"], timeout=action.get("timeout", 5000)
                    )

            # Extract content after interactions
            title = await page.title()
            text_content = await page.evaluate("document.body.innerText")

            return {
                "title": title,
                "content": text_content,
                "url": url,
                "metadata": {
                    "url": url,
                    "final_url": page.url,
                    "type": "html",
                    "scraper": "browser_interactive",
                    "actions_performed": len(actions),
                },
            }

        finally:
            await page.close()
