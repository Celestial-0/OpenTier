"""ChatModelGateway implementations.

Includes:
- LangChainChatAdapter: Catalog-driven chat gateway built on langchain-openai.
- ProviderError: Raised when chat model providers fail.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator, Dict, List, Optional

from shared.llm.ports import ModelEntry, ModelCatalog
from shared.llm.catalog import ModelNotConfigured

logger = logging.getLogger(__name__)


class ProviderError(RuntimeError):
    pass


class LangChainChatAdapter:

    """Catalog-driven chat gateway built on langchain-openai."""

    def __init__(self, catalog: ModelCatalog) -> None:
        self._catalog = catalog

    async def _build_model(
        self,
        entry: ModelEntry,
        temperature: Optional[float],
        max_tokens: Optional[int],
    ):
        from langchain_openai import ChatOpenAI

        api_key = await self._catalog.provider_api_key(entry.provider) or "unset"
        return ChatOpenAI(
            model=entry.slug,
            api_key=api_key,
            base_url=entry.provider.base_url,
            temperature=temperature if temperature is not None else 0.3,
            max_tokens=max_tokens or entry.max_output_tokens or 4096,
            timeout=120,
            stream_usage=True,
        )

    async def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> tuple[str, Dict[str, int]]:
        from shared.llm.tokenizer import count_tokens

        primary, fallbacks = await self._catalog.resolve_chat(model)
        last_exc: Exception | None = None
        for candidate in [primary, *fallbacks]:
            try:
                llm = await self._build_model(candidate, temperature, max_tokens)
                lc_messages = [_to_lc_role(m) for m in messages]
                response = await llm.ainvoke(lc_messages)
                usage = getattr(response, "usage_metadata", None) or {}
                prompt_tokens = int(usage.get("input_tokens", 0))
                completion_tokens = int(usage.get("output_tokens", 0))
                if prompt_tokens == 0:
                    prompt_tokens = sum(
                        count_tokens(m.get("content", "")) for m in messages
                    )
                if completion_tokens == 0:
                    completion_tokens = count_tokens(
                        response.content if isinstance(response.content, str) else ""
                    )
                total_tokens = int(
                    usage.get("total_tokens", prompt_tokens + completion_tokens)
                )
                return response.content, {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                }
            except Exception as exc:  # noqa: BLE001 — walk the fallback chain
                last_exc = exc
                logger.warning(
                    "chat provider failed; falling back (%s): %s",
                    candidate.slug,
                    exc,
                )
        raise ProviderError(f"all chat providers failed: {last_exc}")

    async def stream_with_usage(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[tuple[str, Optional[Dict[str, int]]], None]:
        """Streams text chunks along with any native provider usage metadata emitted."""
        primary, fallbacks = await self._catalog.resolve_chat(model)

        async def _stream_one(
            entry: ModelEntry,
        ) -> AsyncGenerator[tuple[str, Optional[Dict[str, int]]], None]:
            llm = await self._build_model(entry, temperature, max_tokens)
            lc_messages = [_to_lc_role(m) for m in messages]
            async for chunk in llm.astream(lc_messages):
                usage_meta = getattr(chunk, "usage_metadata", None)
                parsed_usage = None
                if usage_meta:
                    parsed_usage = {
                        "prompt_tokens": int(usage_meta.get("input_tokens", 0)),
                        "completion_tokens": int(usage_meta.get("output_tokens", 0)),
                        "total_tokens": int(usage_meta.get("total_tokens", 0)),
                    }
                text = getattr(chunk, "content", "")
                if isinstance(text, str) and text:
                    yield (text, parsed_usage)
                elif parsed_usage:
                    yield ("", parsed_usage)

        try:
            async for token, usage in _stream_one(primary):
                yield (token, usage)
            return
        except ModelNotConfigured:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("primary chat stream failed (%s): %s", primary.slug, exc)

        for candidate in fallbacks:
            try:
                async for token, usage in _stream_one(candidate):
                    yield (token, usage)
                return
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "fallback chat stream failed (%s): %s", candidate.slug, exc
                )
        yield ("[Error: all chat providers failed]", None)

    async def stream(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        async for token, _ in self.stream_with_usage(
            messages, temperature, max_tokens, model
        ):
            if token:
                yield token


def _to_lc_role(message: Dict[str, str]):
    role = message.get("role", "user")
    content = message.get("content", "")
    if role == "system":
        return ("system", content)
    if role == "assistant":
        return ("ai", content)
    return ("human", content)


__all__ = [
    "LangChainChatAdapter",
    "ProviderError",
    "ModelNotConfigured",
]

