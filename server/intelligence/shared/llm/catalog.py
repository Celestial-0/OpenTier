"""DB-backed model catalog.

Reads `model_providers` / `models` — the pricing and routing source of truth.
In-process TTL cache with jitter keeps request-path resolution off the database.
"""

from __future__ import annotations

import os
import random
import time
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text

from shared.llm.ports import ModelEntry, ProviderEntry
from shared.crypto.secrets import SecretsError, open_sealed

CACHE_TTL_SECS = 30.0


class ModelNotConfigured(Exception):
    pass


@dataclass(frozen=True)
class _CacheState:
    providers: dict[str, ProviderEntry]
    by_slug: dict[str, ModelEntry]
    default_chat: Optional[str]
    default_embedding: Optional[str]


class ModelCatalog:
    """Async repository + resolver over the catalog tables."""

    def __init__(self, session_factory) -> None:
        self._session_factory = session_factory
        self._cache: Optional[tuple[float, _CacheState, float]] = None

    # ── public API ────────────────────────────────────────────────────────

    async def resolve_chat(
        self, slug: Optional[str] = None
    ) -> tuple[ModelEntry, list[ModelEntry]]:
        state = await self._state()
        entry = (
            state.by_slug.get(slug)
            if slug
            else state.by_slug.get(state.default_chat or "")
        )
        if entry is None:
            raise ModelNotConfigured(
                f"chat model not found/enabled: {slug or '<default>'}"
            )
        chain = [entry]
        seen = {entry.slug}
        cursor = entry.fallback_slug
        while cursor and cursor not in seen:
            nxt = state.by_slug.get(cursor)
            if nxt is None:
                break
            chain.append(nxt)
            seen.add(nxt.slug)
            cursor = nxt.fallback_slug
        return entry, chain[1:]

    async def default_embedding(self) -> ModelEntry:
        state = await self._state()
        entry = state.by_slug.get(state.default_embedding or "")
        if entry is None:
            raise ModelNotConfigured("no default embedding model configured")
        return entry

    async def provider_api_key(self, provider: ProviderEntry) -> Optional[str]:
        """Decrypt-on-demand; plaintext never touches logs or caches."""
        blob = await self._api_key_blob(provider.id)
        if blob is None:
            if provider.slug == "google":
                return (
                    os.getenv("LLM_API_KEY")
                    or os.getenv("GEMINI_API_KEY")
                    or os.getenv("GOOGLE_API_KEY")
                )
            if provider.slug == "openai":
                return os.getenv("OPENAI_API_KEY")
            if provider.slug == "anthropic":
                return os.getenv("ANTHROPIC_API_KEY")
            if provider.slug == "ollama":
                return "ollama"
            return os.getenv("LLM_API_KEY")
        try:
            return open_sealed(bytes(blob))
        except SecretsError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise SecretsError(f"failed to decrypt key for {provider.slug}") from exc

    def invalidate(self) -> None:
        self._cache = None

    # ── internals ────────────────────────────────────────────────────────

    async def _api_key_blob(self, provider_id: str) -> Optional[bytes]:
        async with self._session_factory() as session:
            row = await session.execute(
                text(
                    "SELECT encrypted_api_key FROM model_providers WHERE id = :id"
                ),
                {"id": provider_id},
            )
            val = row.scalar_one_or_none()
            return bytes(val) if val else None

    async def _state(self) -> _CacheState:
        now = time.monotonic()
        if self._cache and now - self._cache[0] < self._cache[2]:
            return self._cache[1]

        providers: dict[str, ProviderEntry] = {}
        by_slug: dict[str, ModelEntry] = {}
        default_chat: Optional[str] = None
        default_embedding: Optional[str] = None

        async with self._session_factory() as session:
            prov_rows = (
                await session.execute(
                    text(
                        "SELECT id::text, slug, base_url, enabled "
                        "FROM model_providers WHERE enabled"
                    )
                )
            ).all()
            for pid, slug, base_url, _enabled in prov_rows:
                providers[str(pid)] = ProviderEntry(
                    id=str(pid), slug=str(slug), base_url=str(base_url), enabled=True
                )

            model_rows = (
                await session.execute(
                    text(
                        "SELECT m.id::text, m.slug, m.provider_id::text, "
                        "       m.kind::text, m.context_window, m.max_output_tokens, "
                        "       m.dimensions, m.input_cost_per_mtok, "
                        "       m.output_cost_per_mtok, m.capabilities, "
                        "       f.slug AS fallback_slug, m.priority, "
                        "       m.enabled, m.is_default "
                        "FROM models m "
                        "LEFT JOIN models f ON f.id = m.fallback_model_id "
                        "WHERE m.enabled"
                    )
                )
            ).all()
            for (
                mid,
                mslug,
                provider_id,
                kind,
                ctx,
                max_out,
                dims,
                in_cost,
                out_cost,
                caps,
                fallback_slug,
                priority,
                _enabled,
                is_default,
            ) in model_rows:
                provider = providers.get(str(provider_id))
                if provider is None:
                    continue
                entry = ModelEntry(
                    id=str(mid),
                    slug=str(mslug),
                    provider=provider,
                    kind=str(kind),
                    context_window=int(ctx),
                    max_output_tokens=max_out,
                    dimensions=dims,
                    input_cost_per_mtok=float(in_cost or 0),
                    output_cost_per_mtok=float(out_cost or 0),
                    capabilities=dict(caps or {}),
                    fallback_slug=fallback_slug,
                    priority=int(priority or 100),
                    enabled=True,
                )
                by_slug[entry.slug] = entry
                if is_default:
                    if kind == "chat":
                        default_chat = entry.slug
                    elif kind == "embedding":
                        default_embedding = entry.slug

        state = _CacheState(
            providers=providers,
            by_slug=by_slug,
            default_chat=default_chat,
            default_embedding=default_embedding,
        )
        ttl = CACHE_TTL_SECS * (0.75 + random.random() * 0.5)
        self._cache = (now, state, ttl)
        return state
