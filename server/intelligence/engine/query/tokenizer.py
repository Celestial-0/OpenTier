"""Tokenizer utility for accurate token counting."""

import tiktoken
from functools import lru_cache
from core.config import get_config


@lru_cache(maxsize=1)
def _get_encoding() -> tiktoken.Encoding:
    """Get tiktoken encoding for the configured LLM model."""
    model = get_config().llm.model
    try:
        return tiktoken.encoding_for_model(model)
    except KeyError:
        return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Count the number of tokens in text using tiktoken."""
    return len(_get_encoding().encode(text))
