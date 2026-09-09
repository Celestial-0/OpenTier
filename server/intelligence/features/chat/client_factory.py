"""LLM client factory for chat features."""

from core.logging import get_logger
from shared.llm import (
    LangChainChatAdapter,
    ModelCatalog,
)
from shared.database.session import get_session_maker

logger = get_logger(__name__)


def build_llm_client() -> LangChainChatAdapter:
    """Build the catalog-driven LangChain LLM client."""
    logger.info("Initializing LLM client with DB model catalog")
    return LangChainChatAdapter(ModelCatalog(get_session_maker()))


# Alias for convenience
_build_llm_client = build_llm_client

