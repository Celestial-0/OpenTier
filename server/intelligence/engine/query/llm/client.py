"""LLM Client for Intelligence Engine."""

import json
import httpx
from typing import AsyncGenerator, List, Dict, Any, Optional
from core.config import get_config
from core.logging import get_logger
from engine.ingestion.retry import with_retry

logger = get_logger(__name__)


class LLMClient:
    """Simple Async LLM Client using httpx."""

    def __init__(self):
        self.config = get_config().llm
        self.api_key = self.config.api_key
        self.base_url = self.config.base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        # Detect if we should mock
        self.is_mock = self.config.provider == "mock" or not self.api_key

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> tuple[str, Dict[str, int]]:
        """Generate a completion for the given messages.

        Returns:
            Tuple of (response_text, usage_dict) where usage_dict contains:
            - prompt_tokens: Number of tokens in the prompt
            - completion_tokens: Number of tokens in the completion
            - total_tokens: Total tokens used
        """
        if self.is_mock:
            # Return mock response with simulated token counts
            mock_text = "This is a mock response for development purposes."
            return mock_text, {
                "prompt_tokens": 50,
                "completion_tokens": len(mock_text.split()),
                "total_tokens": 50 + len(mock_text.split()),
            }

        payload = {
            "model": model or self.config.model,
            "messages": messages,
            "temperature": temperature or self.config.temperature,
            "max_tokens": max_tokens or self.config.max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]

                # Extract token usage from API response (OpenAI-compatible format)
                usage = data.get("usage", {})
                token_usage = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                return content, token_usage
        except httpx.HTTPStatusError as e:
            logger.error(f"LLM API Error ({e.response.status_code}): {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            raise

    async def stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a completion for the given messages."""
        if self.is_mock:
            mock_text = "Streaming mock response..."
            for word in mock_text.split():
                yield word + " "
            return

        payload = {
            "model": model or self.config.model,
            "messages": messages,
            "temperature": temperature or self.config.temperature,
            "max_tokens": max_tokens or self.config.max_tokens,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            line = line[6:]  # Strip "data: "
                            if line.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(line)
                                delta = chunk["choices"][0]["delta"]
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"LLM Streaming failed: {e}")
            yield f"[Error: {str(e)}]"
