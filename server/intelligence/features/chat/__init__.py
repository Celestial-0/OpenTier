"""Chat feature slice (conversations, messages, RAG pipeline, graph, memory)."""

from features.chat.repository import ChatRepository, MemoryRepository
from features.chat.pipeline import QueryPipeline, QueryContext, QueryResponse
from features.chat.graph import ChatGraphRunner, ChatState, use_chat_graph
from features.chat.memory import (
    generate_memory_update,
    handle_memory_extraction,
)
from features.chat.service import ChatService
from features.chat.grpc_servicer import ChatServicer
from features.chat.client_factory import build_llm_client, _build_llm_client

__all__ = [
    "ChatRepository",
    "MemoryRepository",
    "QueryPipeline",
    "QueryContext",
    "QueryResponse",
    "ChatGraphRunner",
    "ChatState",
    "use_chat_graph",
    "generate_memory_update",
    "handle_memory_extraction",
    "ChatService",
    "ChatServicer",
    "build_llm_client",
    "_build_llm_client",
]
