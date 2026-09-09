"""Database module: models, engine, and session management."""

from shared.database.models import (
    Base,
    ChatMessage,
    Conversation,
    Document,
    DocumentChunk,
    IngestionJob,
    UserMemory,
)
from shared.database.session import (
    close_db,
    get_engine,
    get_session,
    get_session_maker,
    health_check,
    init_db,
)

__all__ = [
    # Models
    "Base",
    "ChatMessage",
    "Conversation",
    "Document",
    "DocumentChunk",
    "IngestionJob",
    "UserMemory",
    # Session management
    "close_db",
    "get_engine",
    "get_session",
    "get_session_maker",
    "health_check",
    "init_db",
]
