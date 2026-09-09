"""GitHub markdown scraper for documentation and repositories."""

import re
from typing import Optional
from urllib.parse import urlparse

import httpx
from github import Github, GithubException

from core.logging import get_logger

logger = get_logger(__name__)


class GitHubScraper:
    """Scraper for GitHub markdown files and repositories."""

    def __init__(self, github_token: Optional[str] = None):
        """Initialize GitHub scraper.

        Args:
            github_token: Optional GitHub personal access token for higher rate limits
        """
        self.client = httpx.AsyncClient(timeout=30.0)
        self.github = Github(github_token) if github_token else Github()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    async def scrape(self, url: str) -> dict:
        """Scrape GitHub URL and extract markdown content.

        Args:
            url: GitHub URL (blob, raw, or repo)

        Returns:
            Dictionary with title, content, and metadata
        """
        try:
            # Detect URL type
            if "/blob/" in url or "/raw/" in url:
                # Single file
                return await self._scrape_file(url)
            elif self._is_repo_url(url):
                # Repository root
                return await self._scrape_repo_readme(url)
            else:
                raise ValueError(f"Unsupported GitHub URL format: {url}")

        except Exception as e:
            logger.error(f"Failed to scrape GitHub URL {url}: {e}")
            raise

    async def discover_markdown_files(
        self, repo_url: str, max_files: int = 100
    ) -> list[dict]:
        """Discover all markdown files in a GitHub repository.

        Args:
            repo_url: GitHub repository URL
            max_files: Maximum number of files to discover

        Returns:
            List of file info dictionaries
        """
        try:
            owner, repo = self._parse_repo_url(repo_url)
            repository = self.github.get_repo(f"{owner}/{repo}")

            markdown_files = []
            contents = repository.get_contents("")

            while contents and len(markdown_files) < max_files:
                file_content = contents.pop(0)

                if file_content.type == "dir":
                    # Add directory contents to queue
                    contents.extend(repository.get_contents(file_content.path))
                elif file_content.name.endswith((".md", ".markdown")):
                    markdown_files.append(
                        {
                            "path": file_content.path,
                            "name": file_content.name,
                            "url": file_content.html_url,
                            "download_url": file_content.download_url,
                            "size": file_content.size,
                        }
                    )

            logger.info(
                f"Discovered {len(markdown_files)} markdown files in {repo_url}"
            )
            return markdown_files

        except GithubException as e:
            logger.error(f"GitHub API error: {e}")
            raise

    async def _scrape_file(self, url: str) -> dict:
        """Scrape a single markdown file."""
        raw_url = self._convert_to_raw_url(url)

        response = await self.client.get(raw_url)
        response.raise_for_status()

        content = response.text
        title = self._extract_title_from_markdown(content) or self._extract_filename(
            url
        )

        return {
            "title": title,
            "content": content,
            "url": url,
            "raw_url": raw_url,
            "type": "markdown",
            "metadata": {
                "source": "github",
                "content_type": "markdown",
            },
        }

    async def _scrape_repo_readme(self, repo_url: str) -> dict:
        """Scrape repository README file."""
        try:
            owner, repo = self._parse_repo_url(repo_url)
            repository = self.github.get_repo(f"{owner}/{repo}")

            # Try to get README
            readme = repository.get_readme()
            content = readme.decoded_content.decode("utf-8")

            return {
                "title": f"{repository.full_name} - README",
                "content": content,
                "url": repo_url,
                "raw_url": readme.download_url,
                "type": "markdown",
                "metadata": {
                    "source": "github",
                    "repository": repository.full_name,
                    "stars": repository.stargazers_count,
                    "description": repository.description,
                },
            }

        except GithubException as e:
            logger.error(f"Failed to get README for {repo_url}: {e}")
            raise

    def _convert_to_raw_url(self, url: str) -> str:
        """Convert GitHub blob URL to raw content URL."""
        if "raw.githubusercontent.com" in url:
            return url

        # Convert blob URL to raw URL
        # https://github.com/user/repo/blob/branch/file.md
        # -> https://raw.githubusercontent.com/user/repo/branch/file.md
        url = url.replace("github.com", "raw.githubusercontent.com")
        url = url.replace("/blob/", "/")

        return url

    def _is_repo_url(self, url: str) -> bool:
        """Check if URL is a repository root URL."""
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split("/") if p]

        # Repository URL has exactly 2 path parts: owner/repo
        return len(path_parts) == 2 and "github.com" in parsed.netloc

    def _parse_repo_url(self, url: str) -> tuple[str, str]:
        """Parse repository URL to extract owner and repo name."""
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split("/") if p]

        if len(path_parts) < 2:
            raise ValueError(f"Invalid repository URL: {url}")

        return path_parts[0], path_parts[1]

    def _extract_title_from_markdown(self, content: str) -> Optional[str]:
        """Extract title from markdown content (first H1)."""
        # Look for first # heading
        match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip()
        return None

    def _extract_filename(self, url: str) -> str:
        """Extract filename from URL."""
        parsed = urlparse(url)
        filename = parsed.path.split("/")[-1]
        # Remove extension
        return filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
        self.github.close()
