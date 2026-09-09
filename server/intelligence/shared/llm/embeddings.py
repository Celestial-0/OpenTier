"""Embedding + sparse encoders for the Qdrant path.

- OpenAIEmbeddingGateway: cloud embeddings via langchain-openai, catalog/env
  driven (production default).
- HashedSparseEncoder: dependency-free BM25-style sparse leg (hashed unigram
  TF). Replaceable by fastembed BM25 without touching consumers.
"""

from __future__ import annotations

import hashlib
import logging
import math
import os
import re
from collections import Counter
from typing import Any, List, Optional, Sequence


_TOKEN_RE = re.compile(r"[a-z0-9]+")


class HashedSparseEncoder:
    """Deterministic hashed bag-of-words -> SparseVector-compatible pair."""

    def __init__(self, dim: int = 65_536) -> None:
        self.dim = dim

    def _index(self, token: str) -> int:
        return int.from_bytes(
            hashlib.sha1(token.encode()).digest()[:4], "little"
        ) % self.dim

    def encode(self, text: str) -> tuple[List[int], List[float]]:
        tokens = _TOKEN_RE.findall(text.lower())
        if not tokens:
            return [], []
        counts = Counter(tokens)
        max_tf = max(counts.values())
        index_weights: dict[int, float] = {}
        for token, tf in counts.items():
            idx = self._index(token)
            weight = 0.5 + 0.5 * math.log(1 + tf / max_tf)  # sublinear TF
            index_weights[idx] = index_weights.get(idx, 0.0) + weight

        # Qdrant strictly requires unique indices; sort ascending for consistency
        sorted_pairs = sorted(index_weights.items(), key=lambda p: p[0])
        indices = [p[0] for p in sorted_pairs]
        values = [round(p[1], 6) for p in sorted_pairs]
        return indices, values


class CloudEmbeddingGateway:

    """Production cloud embeddings (Google Gemini, OpenAI, Ollama, etc. via standard OpenAI-compatible API)."""

    def __init__(
        self,
        model: str,
        api_key: str,
        base_url: str | None = None,
        dims: int | None = None,
        batch_size: int = 64,
        provider_slug: str | None = None,
    ) -> None:
        from openai import AsyncOpenAI

        self.dims = dims
        self.model = model
        self.batch_size = batch_size
        self.provider_slug = provider_slug or (
            "google" if (base_url and "generativelanguage" in base_url) else "openai"
        )
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            max_retries=1,
        )

    async def _embed_batch_with_retry(self, batch: List[str]) -> List[List[float]]:
        import re
        import asyncio
        from openai import RateLimitError

        for attempt in range(6):
            try:
                kwargs: dict[str, Any] = {}
                if self.dims:
                    kwargs["dimensions"] = self.dims
                res = await self._client.embeddings.create(
                    model=self.model,
                    input=batch,
                    **kwargs,
                )
                items = sorted(res.data, key=lambda x: x.index if x.index is not None else 0)
                return [item.embedding for item in items]
            except RateLimitError as rle:
                delay = 35.0
                m = re.search(r"retry in ([0-9.]+)", str(rle), re.IGNORECASE)
                if m:
                    delay = float(m.group(1)) + 1.5
                logger.warning(
                    "Rate limit hit on %s embedding provider (%s); waiting %.1fs before retry (attempt %d/6)",
                    self.provider_slug.upper(),
                    self.model,
                    delay,
                    attempt + 1,
                )
                await asyncio.sleep(delay)
            except Exception as exc:
                if attempt == 5:
                    raise exc
                delay = min(2.0 ** attempt, 30.0)
                logger.warning(
                    "Transient error in %s embedding (%s); retrying in %.1fs: %s",
                    self.provider_slug,
                    self.model,
                    delay,
                    exc,
                )
                await asyncio.sleep(delay)
        raise RuntimeError(f"Exceeded maximum retry attempts for {self.provider_slug} embeddings ({self.model})")

    async def embed_documents(self, texts: Sequence[str]) -> List[List[float]]:
        out: List[List[float]] = []
        texts = list(texts)
        step = max(1, self.batch_size)
        for i in range(0, len(texts), step):
            batch = texts[i : i + step]
            vecs = await self._embed_batch_with_retry(batch)
            out.extend(vecs)
        return out

    async def embed_query(self, text: str) -> List[float]:
        vecs = await self._embed_batch_with_retry([text])
        return vecs[0]


# Backward compatibility alias
OpenAIEmbeddingGateway = CloudEmbeddingGateway


logger = logging.getLogger(__name__)


def fetch_active_embedding_config(
    model_slug: Optional[str] = None,
) -> Optional[tuple[str, str, Optional[str], int, str]]:
    """Fetch active system embedding model, decrypted API key, base URL, dimensions, and provider slug from PostgreSQL."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return None
    try:
        import psycopg
        from shared.crypto.secrets import open_sealed

        conn_str = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")
        with psycopg.connect(conn_str) as conn:
            with conn.cursor() as cur:
                if model_slug:
                    cur.execute(
                        """
                        SELECT m.slug, m.dimensions, p.slug, p.base_url, p.encrypted_api_key
                        FROM models m
                        JOIN model_providers p ON p.id = m.provider_id
                        WHERE m.slug = %s AND m.kind = 'embedding' AND m.enabled = TRUE AND p.enabled = TRUE
                        LIMIT 1
                        """,
                        (model_slug,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT m.slug, m.dimensions, p.slug, p.base_url, p.encrypted_api_key
                        FROM models m
                        JOIN model_providers p ON p.id = m.provider_id
                        WHERE m.kind = 'embedding' AND m.is_default = TRUE AND m.enabled = TRUE AND p.enabled = TRUE
                        LIMIT 1
                        """
                    )
                row = cur.fetchone()
                if row:
                    slug, dims, provider_slug, base_url, encrypted_key = row
                    api_key = ""
                    if encrypted_key:
                        try:
                            api_key = open_sealed(bytes(encrypted_key)) or ""
                        except Exception as dec_err:
                            logger.warning("Failed to decrypt DB api key for provider %s: %s", provider_slug, dec_err)

                    # Provider-specific environment variable fallback if not stored in DB
                    if not api_key:
                        if provider_slug == "google":
                            api_key = (
                                os.getenv("GEMINI_API_KEY")
                                or os.getenv("GOOGLE_API_KEY")
                                or os.getenv("LLM_API_KEY")
                                or ""
                            ).strip()
                        elif provider_slug == "openai":
                            api_key = (os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()
                        elif provider_slug == "anthropic":
                            api_key = (os.getenv("ANTHROPIC_API_KEY") or os.getenv("LLM_API_KEY") or "").strip()
                        elif provider_slug == "ollama":
                            api_key = "ollama"
                        else:
                            api_key = (os.getenv("LLM_API_KEY") or "").strip()

                    # Ensure standard default base_url if empty
                    if not base_url:
                        if provider_slug == "google":
                            base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
                        elif provider_slug == "openai":
                            base_url = "https://api.openai.com/v1"
                        elif provider_slug == "ollama":
                            base_url = "http://host.docker.internal:11434/v1"

                    resolved_dims = dims or (3072 if slug == "gemini-embedding-2" else 768)
                    return (slug, api_key, base_url, resolved_dims, provider_slug)
    except Exception as exc:
        logger.debug("Could not fetch active embedding config from DB (%s); falling back to env", exc)
    return None


def build_embedding_gateway(
    default_dims: int = 3072,
    model_slug: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    provider_slug: Optional[str] = None,
) -> CloudEmbeddingGateway:
    """Dynamically builds embedding gateway from DB catalog (system entity) with env fallback."""
    # 1. If explicit credentials and model provided (e.g. from service.py / catalog)
    if api_key and model_slug:
        p_slug = provider_slug or (
            "google" if (base_url and "generativelanguage" in base_url) else "openai"
        )
        logger.info(
            "Initializing embedding gateway: model=%s, provider=%s, dims=%d, endpoint=%s",
            model_slug,
            p_slug,
            default_dims,
            base_url,
        )
        return CloudEmbeddingGateway(
            model=model_slug,
            api_key=api_key,
            base_url=base_url,
            dims=default_dims,
            provider_slug=p_slug,
        )

    # 2. Fetch real active embedding configuration from PostgreSQL
    db_config = fetch_active_embedding_config(model_slug=model_slug)
    if db_config:
        model, resolved_key, resolved_base_url, dims, p_slug = db_config
        if resolved_key:
            try:
                logger.info(
                    "Initializing DB-configured embedding gateway: model=%s, provider=%s, dims=%d, endpoint=%s",
                    model,
                    p_slug,
                    dims,
                    resolved_base_url,
                )
                return CloudEmbeddingGateway(
                    model=model,
                    api_key=resolved_key,
                    base_url=resolved_base_url,
                    dims=dims,
                    provider_slug=p_slug,
                )
            except Exception as exc:
                logger.warning("Failed to initialize DB-configured embedding gateway (%s); trying env", exc)

    # 3. Env var fallback
    provider = (
        provider_slug
        or os.environ.get("LLM_PROVIDER", "").strip().lower()
        or ("google" if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") else "openai")
    )

    if provider == "google":
        api_key = (
            os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GOOGLE_API_KEY", "").strip()
            or os.environ.get("LLM_API_KEY", "").strip()
        )
        base_url = (
            os.environ.get("GOOGLE_BASE_URL")
            or os.environ.get("LLM_BASE_URL")
            or "https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        model = model_slug or os.environ.get("EMBEDDING_MODEL_NAME", "gemini-embedding-2")
        dims = 3072 if model == "gemini-embedding-2" else 768
    else:
        api_key = (
            os.environ.get("OPENAI_API_KEY", "").strip()
            or os.environ.get("LLM_API_KEY", "").strip()
        )
        base_url = os.environ.get("OPENAI_BASE_URL") or os.environ.get("LLM_BASE_URL") or None
        model = (
            model_slug
            or os.environ.get("OPENAI_EMBEDDING_MODEL")
            or os.environ.get("EMBEDDING_MODEL_NAME", "text-embedding-3-small")
        )
        dims = default_dims

    if not api_key:
        raise RuntimeError(
            f"No API key configured for embedding provider '{provider}' (model: '{model}'). "
            f"Please configure an API key in the admin dashboard or set the appropriate environment variable."
        )

    logger.info(
        "Initializing fallback embedding gateway: model=%s, provider=%s, dims=%d, endpoint=%s",
        model,
        provider,
        dims,
        base_url,
    )
    return CloudEmbeddingGateway(
        model=model,
        api_key=api_key,
        base_url=base_url,
        dims=dims,
        provider_slug=provider,
    )


__all__ = [
    "HashedSparseEncoder",
    "CloudEmbeddingGateway",
    "OpenAIEmbeddingGateway",
    "build_embedding_gateway",
]

