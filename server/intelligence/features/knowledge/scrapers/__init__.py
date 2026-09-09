"""Scrapers package for web content extraction."""

from .web import WebScraper
from .github import GitHubScraper
from .browser import BrowserScraper

__all__ = [
    "WebScraper",
    "GitHubScraper",
    "BrowserScraper",
]
