"""Versioned prompt templates.

Prompts live as files next to this loader — never inline f-strings in code.
Templates use plain str.format placeholders.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_DIR = Path(__file__).resolve().parent


@lru_cache(maxsize=32)
def load(name: str) -> str:
    """Load a prompt template by filename (with extension)."""
    path = _DIR / name
    if not path.is_file():
        raise FileNotFoundError(f"prompt template not found: {name}")
    return path.read_text(encoding="utf-8")


def render(name: str, **values) -> str:
    return load(name).format(**values)
