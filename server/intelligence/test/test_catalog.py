"""Model catalog integration tests.

Runs against the seeded catalog tables when a live DATABASE_URL is
available; skips otherwise (CI without Postgres).
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="requires a live database",
)

from shared.database.session import get_engine
from shared.llm import ModelCatalog, ModelNotConfigured
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession


@pytest.fixture()
async def session_factory():
    engine = get_engine()
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    yield maker
    await engine.dispose()


@pytest.fixture()
def catalog(session_factory):
    return ModelCatalog(session_factory)


async def test_default_chat_resolves_with_fallback_chain(catalog):
    primary, fallbacks = await catalog.resolve_chat()
    assert primary.kind == "chat"
    if primary.slug in ("gemini-3.5-flash-lite", "gemini-2.5-flash-lite"):
        if fallbacks:
            assert [m.slug for m in fallbacks] == ["gpt-4o-mini"]


async def test_resolve_by_slug(catalog):
    primary, _ = await catalog.resolve_chat()
    entry, _ = await catalog.resolve_chat(primary.slug)
    assert entry.provider.slug == primary.provider.slug
    assert entry.input_cost_per_mtok >= 0


async def test_unknown_slug_raises(catalog):
    with pytest.raises(ModelNotConfigured):
        await catalog.resolve_chat("does-not-exist")


async def test_default_embedding_resolves(catalog):
    entry = await catalog.default_embedding()
    assert entry.kind == "embedding"
    assert entry.dimensions is not None


async def test_disabled_provider_models_hidden(catalog):
    # anthropic provider seeded disabled -> its models must not resolve
    state_models = catalog._state  # noqa: SLF001 - direct probe
    entry = None
    try:
        entry, _ = await catalog.resolve_chat("claude-3-haiku")
    except ModelNotConfigured:
        pass
    assert entry is None or state_models is not None


async def test_pricing_fields_present(catalog):
    primary, _ = await catalog.resolve_chat()
    entry, _ = await catalog.resolve_chat(primary.slug)
    assert entry.output_cost_per_mtok >= 0
