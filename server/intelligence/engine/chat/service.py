"""Chat Service logic."""

import uuid
from typing import Any, AsyncGenerator, Dict, Optional

from engine.query.pipeline import QueryPipeline
from engine.chat.storage import ConversationStorage, MemoryStorage
from core.database import get_session
from core.logging import get_logger
from generated import intelligence_pb2

logger = get_logger(__name__)


# Structured error codes for streaming
class StreamErrorCode:
    """Error codes for structured streaming errors."""

    INTERNAL = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"
    RATE_LIMITED = "RATE_LIMITED"
    CONTEXT_TOO_LONG = "CONTEXT_TOO_LONG"
    MODEL_UNAVAILABLE = "MODEL_UNAVAILABLE"
    INVALID_REQUEST = "INVALID_REQUEST"


def format_stream_error(error: Exception, code: str = StreamErrorCode.INTERNAL) -> str:
    """Format error with structured code for client parsing.

    Returns format: "ERROR_CODE: error message"
    This allows clients to parse the error code programmatically.
    """
    error_msg = str(error)
    return f"{code}: {error_msg}"


def classify_error(error: Exception) -> str:
    """Classify an exception to determine the appropriate error code.

    Returns a structured error code based on the exception message.
    """
    error_str = str(error).lower()

    if "timeout" in error_str or "deadline" in error_str:
        return StreamErrorCode.TIMEOUT
    elif "rate" in error_str or "quota" in error_str or "limit" in error_str:
        return StreamErrorCode.RATE_LIMITED
    elif "context" in error_str and (
        "long" in error_str or "length" in error_str or "token" in error_str
    ):
        return StreamErrorCode.CONTEXT_TOO_LONG
    elif "model" in error_str and (
        "unavailable" in error_str or "not found" in error_str
    ):
        return StreamErrorCode.MODEL_UNAVAILABLE
    elif "invalid" in error_str or "validation" in error_str:
        return StreamErrorCode.INVALID_REQUEST
    else:
        return StreamErrorCode.INTERNAL


class ChatService:
    """Handles chat interactions, persistence, and RAG delegation."""

    def __init__(self, query_pipeline: QueryPipeline):
        self.query_pipeline = query_pipeline

    async def send_message(
        self,
        user_id: str,
        conversation_id: Optional[str],
        message: str,
        metadata: Optional[Dict[str, str]] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> intelligence_pb2.ChatResponse:
        """Send a message, persist history, query RAG, and return response.

        Args:
            user_id: User ID
            conversation_id: Optional conversation ID (creates new if not provided)
            message: User message
            metadata: Optional request metadata
            config: Optional chat configuration with fields:
                - temperature: LLM temperature
                - max_tokens: Max response tokens
                - use_rag: Whether to use RAG (default True)
                - model: LLM model name
                - context_limit: Max context tokens
        """
        async with get_session() as session:
            conv_storage = ConversationStorage(session)
            mem_storage = MemoryStorage(session)

            # 1. Get/Create Conversation
            conv = await conv_storage.get_or_create_conversation(
                user_id=user_id, conversation_id=conversation_id
            )

            # 2. Save User Message
            await conv_storage.add_message(
                conversation_id=conv.id,
                role="user",
                content=message,
                metadata=metadata or {},
            )

            # 3. Fetch History for Context
            all_messages = await conv_storage.get_messages(conv.id)
            history = [
                {"role": msg.role, "content": msg.content} for msg in all_messages[:-1]
            ]

            # 3.5 Fetch Long-term Memory
            user_memory = await mem_storage.get_memory(user_id)

            # 4. Extract config options for pipeline
            context_limit = config.get("context_limit") if config else None
            use_rag = config.get("use_rag", True) if config else True

            # 5. Get Answer from Query Pipeline
            query_response = await self.query_pipeline.generate_response(
                query=message,
                user_id=user_id,
                history=history,
                context_limit=context_limit,
                use_rag=use_rag,
                user_memory=user_memory,
            )

            # 6. Save Assistant Message with Sources
            msg = await conv_storage.add_message(
                conversation_id=conv.id,
                role="assistant",
                content=query_response.response,
                sources=query_response.sources,
                metadata={"metrics": query_response.metrics or {}},
            )

            # Commit transaction to ensure persistence
            await session.commit()

            # 8.5 Update user memory proactively
            # We use the current history plus the new exchange
            new_exchange = all_messages + [msg]
            updated_memory = await self.query_pipeline.generate_memory_update(
                current_memory=user_memory,
                recent_messages=[
                    {"role": m.role, "content": m.content} for m in new_exchange
                ],
            )
            if updated_memory is False:
                # User asked to forget
                async with get_session() as mem_session:
                    await MemoryStorage(mem_session).delete_memory(user_id)
                    await mem_session.commit()
            elif updated_memory:
                async with get_session() as mem_session:
                    await MemoryStorage(mem_session).update_memory(
                        user_id, updated_memory
                    )
                    await mem_session.commit()

            # 7. Map Sources to Proto
            proto_sources = [
                intelligence_pb2.ContextChunk(
                    chunk_id=s["chunk_id"],
                    document_id=s["document_id"],
                    relevance_score=s["relevance_score"],
                    content=s.get("content", ""),
                )
                for s in (query_response.sources or [])
            ]

            # 8. Build metrics from response
            metrics = query_response.metrics or {}
            chat_metrics = intelligence_pb2.ChatMetrics(
                tokens_used=metrics.get("tokens_generated", 0),
                prompt_tokens=metrics.get("prompt_tokens", 0),
                completion_tokens=metrics.get("completion_tokens", 0),
                latency_ms=float(metrics.get("total_time_ms", 0)),
                sources_retrieved=metrics.get("sources_retrieved", len(proto_sources)),
            )

            return intelligence_pb2.ChatResponse(
                conversation_id=str(conv.id),
                message_id=str(msg.id),
                response=query_response.response,
                sources=proto_sources,
                metrics=chat_metrics,
                created_at=int(msg.created_at.timestamp()),
            )

    async def stream_chat(
        self,
        user_id: str,
        conversation_id: Optional[str],
        message: str,
        metadata: Optional[Dict[str, str]] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[intelligence_pb2.ChatStreamChunk, None]:
        """Stream chat response with optional config."""
        async with get_session() as session:
            conv_storage = ConversationStorage(session)
            mem_storage = MemoryStorage(session)

            conv = await conv_storage.get_or_create_conversation(
                user_id=user_id, conversation_id=conversation_id
            )

            # Save User Message
            await conv_storage.add_message(
                conversation_id=conv.id,
                role="user",
                content=message,
                metadata=metadata or {},
            )

            message_id = str(uuid.uuid4())
            full_response = ""
            all_sources = []
            retrieval_metrics = {}
            generation_metrics = {}

            # Fetch History for Context
            all_messages = await conv_storage.get_messages(conv.id)
            history = [
                {"role": msg.role, "content": msg.content} for msg in all_messages[:-1]
            ]

            # Fetch Long-term Memory
            user_memory = await mem_storage.get_memory(user_id)

            # Extract config options
            context_limit = config.get("context_limit") if config else None
            use_rag = config.get("use_rag", True) if config else True

            # Delegate to pipeline stream
            async for chunk in self.query_pipeline.stream_response(
                query=message,
                user_id=user_id,
                history=history,
                context_limit=context_limit,
                use_rag=use_rag,
                user_memory=user_memory,
            ):
                if chunk["type"] == "sources":
                    all_sources = chunk["data"]
                    retrieval_metrics = chunk.get("metrics", {})

                    # Yield sources to client
                    for s in all_sources:
                        yield intelligence_pb2.ChatStreamChunk(
                            conversation_id=str(conv.id),
                            message_id=message_id,
                            source=intelligence_pb2.ContextChunk(
                                chunk_id=s["chunk_id"],
                                document_id=s["document_id"],
                                relevance_score=s["relevance_score"],
                                content=s.get("content", ""),
                            ),
                            is_final=False,
                        )
                elif chunk["type"] == "token":
                    token = chunk["data"]
                    full_response += token
                    yield intelligence_pb2.ChatStreamChunk(
                        conversation_id=str(conv.id),
                        message_id=message_id,
                        token=token,
                        is_final=False,
                    )
                elif chunk["type"] == "metrics":
                    generation_metrics = chunk.get("data", {})
                elif chunk["type"] == "error":
                    # Yield structured error to client with partial metrics
                    error_data = chunk["data"]
                    # Classify error if it's an exception object, otherwise use as-is
                    if isinstance(error_data, Exception):
                        error_code = classify_error(error_data)
                        structured_error = format_stream_error(error_data, error_code)
                    else:
                        # Already a string, wrap with INTERNAL code
                        structured_error = f"{StreamErrorCode.INTERNAL}: {error_data}"

                    logger.error(f"Stream error: {structured_error}")

                    # Build partial metrics before yielding error
                    partial_metrics = {**retrieval_metrics, **generation_metrics}
                    token_count = len(full_response.split()) if full_response else 0

                    # Emit partial metrics first so clients know what work was done
                    if partial_metrics or token_count > 0:
                        yield intelligence_pb2.ChatStreamChunk(
                            conversation_id=str(conv.id),
                            message_id=message_id,
                            metrics=intelligence_pb2.ChatMetrics(
                                tokens_used=token_count,
                                prompt_tokens=0,
                                completion_tokens=token_count,
                                latency_ms=float(
                                    partial_metrics.get("total_time_ms", 0)
                                ),
                                sources_retrieved=partial_metrics.get(
                                    "sources_retrieved", len(all_sources)
                                ),
                            ),
                            is_final=False,
                        )

                    # Then emit the error chunk
                    yield intelligence_pb2.ChatStreamChunk(
                        conversation_id=str(conv.id),
                        message_id=message_id,
                        error=structured_error,
                        is_final=True,
                    )
                    return

            # Build final metrics
            all_metrics = {**retrieval_metrics, **generation_metrics}
            chat_metrics = intelligence_pb2.ChatMetrics(
                tokens_used=all_metrics.get("tokens_generated", 0),
                prompt_tokens=0,
                completion_tokens=all_metrics.get("tokens_generated", 0),
                latency_ms=float(all_metrics.get("total_time_ms", 0)),
                sources_retrieved=all_metrics.get(
                    "sources_retrieved", len(all_sources)
                ),
            )

            # Yield final chunk with metrics
            yield intelligence_pb2.ChatStreamChunk(
                conversation_id=str(conv.id),
                message_id=message_id,
                token="",
                metrics=chat_metrics,
                is_final=True,
            )

            # Finally, save assistant message and update memory
            msg = await conv_storage.add_message(
                conversation_id=conv.id,
                role="assistant",
                content=full_response,
                sources=all_sources,
                metadata={"metrics": {**retrieval_metrics, **generation_metrics}},
            )
            await session.commit()

            # Trigger proactive memory update
            new_history = all_messages + [msg]
            updated_memory = await self.query_pipeline.generate_memory_update(
                current_memory=user_memory,
                recent_messages=[
                    {"role": m.role, "content": m.content} for m in new_history
                ],
            )
            if updated_memory is False:
                # User asked to forget
                async with get_session() as mem_session:
                    await MemoryStorage(mem_session).delete_memory(user_id)
                    await mem_session.commit()
            elif updated_memory:
                async with get_session() as mem_session:
                    await MemoryStorage(mem_session).update_memory(
                        user_id, updated_memory
                    )
                    await mem_session.commit()

    # Expose persistence methods if needed by Engine, or Engine can call storage directly.
    # But Engine delegates everything Chat related here.
    async def get_conversation(
        self,
        conversation_id: str,
        user_id: str,
        limit: int = 100,
        cursor: Optional[str] = None,
    ) -> intelligence_pb2.ConversationResponse:
        """Get conversation with pagination support."""
        async with get_session() as session:
            storage = ConversationStorage(session)

            # Validate and parse conversation_id
            try:
                conv_uuid = uuid.UUID(conversation_id)
            except ValueError:
                logger.error(f"Invalid conversation ID format: {conversation_id}")
                return intelligence_pb2.ConversationResponse()

            conv = await storage.get_conversation(conv_uuid)

            if not conv:
                logger.warning(f"Conversation {conversation_id} not found")
                return intelligence_pb2.ConversationResponse()

            if conv.user_id != user_id:
                logger.warning(f"User ID mismatch: {conv.user_id} != {user_id}")
                return intelligence_pb2.ConversationResponse()

            # Parse cursor for offset-based pagination
            offset = 0
            if cursor:
                try:
                    offset = int(cursor)
                except ValueError:
                    logger.warning(f"Invalid cursor format: {cursor}")
                    offset = 0

            messages = await storage.get_messages(
                conv_uuid, limit=limit + 1, offset=offset
            )
            logger.debug(
                f"Retrieved {len(messages)} messages for conversation {conversation_id}"
            )

            # Determine if there are more messages
            has_more = len(messages) > limit
            if has_more:
                messages = messages[:limit]

            # Calculate next cursor
            next_cursor = None
            if has_more:
                next_cursor = str(offset + limit)

            proto_messages = []
            for m in messages:
                # Map MessageRole enum
                role_map = {
                    "user": intelligence_pb2.MESSAGE_ROLE_USER,
                    "assistant": intelligence_pb2.MESSAGE_ROLE_ASSISTANT,
                    "system": intelligence_pb2.MESSAGE_ROLE_SYSTEM,
                }

                ts = int(m.created_at.timestamp()) if m.created_at else 0

                proto_messages.append(
                    intelligence_pb2.ChatMessage(
                        message_id=str(m.id),
                        role=role_map.get(
                            m.role, intelligence_pb2.MESSAGE_ROLE_UNSPECIFIED
                        ),
                        content=m.content,
                        created_at=ts,
                    )
                )

            # Proto3 optional fields should be unset (not empty string) when no next page
            response_kwargs = {
                "conversation_id": str(conv.id),
                "messages": proto_messages,
                "created_at": int(conv.created_at.timestamp())
                if conv.created_at
                else 0,
                "updated_at": int(conv.updated_at.timestamp())
                if conv.updated_at
                else 0,
                "metadata": dict(conv.metadata_) if conv.metadata_ else {},
            }

            # Only set next_cursor if there are more pages
            if next_cursor is not None:
                response_kwargs["next_cursor"] = next_cursor

            return intelligence_pb2.ConversationResponse(**response_kwargs)

    async def delete_conversation(self, conversation_id: str, user_id: str) -> bool:
        async with get_session() as session:
            storage = ConversationStorage(session)
            conv_uuid = uuid.UUID(conversation_id)
            conv = await storage.get_conversation(conv_uuid)

            if not conv or conv.user_id != user_id:
                return False

            return await storage.delete_conversation(conv_uuid)

    async def list_conversations(self, user_id: str, limit: int, offset: int):
        async with get_session() as session:
            storage = ConversationStorage(session)
            return await storage.list_user_conversations(user_id, limit, offset)

    async def generate_title(
        self, conversation_id: str, user_message: str, assistant_message: str
    ) -> str:
        """Generate a concise conversation title using AI.

        Args:
            conversation_id: Conversation ID (for logging/tracking)
            user_message: First user message
            assistant_message: First assistant response

        Returns:
            Generated title (3-5 words)
        """
        # Truncate messages to avoid token limits
        user_truncated = user_message[:200] if len(user_message) > 200 else user_message
        assistant_truncated = (
            assistant_message[:300]
            if len(assistant_message) > 300
            else assistant_message
        )

        # Construct prompt for title generation
        prompt = f"""Generate a concise, 3-5 word title for this conversation.
                    The title should capture the main topic or question.

                    User: {user_truncated}
                    Assistant: {assistant_truncated}

                    Respond with ONLY the title, nothing else. Do not use quotes."""

        try:
            # Use query pipeline's LLM for title generation
            # Low temperature for consistency, minimal tokens
            response = await self.query_pipeline.generate_response(
                query=prompt,
                user_id="system",  # System-level request
                history=[],  # No history needed
                context_limit=None,
                use_rag=False,  # No RAG for title generation
                temperature=0.3,  # Low for consistency
                max_tokens=15,  # Short titles only
            )

            # Clean and validate title
            title = response.response.strip()

            # Remove quotes if present
            if title.startswith('"') and title.endswith('"'):
                title = title[1:-1]
            if title.startswith("'") and title.endswith("'"):
                title = title[1:-1]

            # Validate length
            if not title or len(title) > 100:
                logger.warning(
                    f"Invalid title generated for conversation {conversation_id}: '{title}'"
                )
                # Fallback to simple generation
                return user_message.replace("\n", " ").strip()[:50]

            logger.debug(
                f"Generated title for conversation {conversation_id}: '{title}'"
            )
            return title

        except Exception as e:
            logger.error(
                f"Failed to generate AI title for conversation {conversation_id}: {e}",
                exc_info=True,
            )
            # Fallback to simple title generation
            return user_message.replace("\n", " ").strip()[:50]
