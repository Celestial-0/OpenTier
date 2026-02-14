import grpc
import uuid
from typing import Optional
from core.logging import get_logger
from generated import intelligence_pb2
from generated import intelligence_pb2_grpc

logger = get_logger(__name__)


def classify_grpc_error(error: Exception) -> grpc.StatusCode:
    """Classify an exception to the appropriate gRPC status code.

    This enables proper client-side error handling and retry logic.
    """
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()

    # Check for common error patterns
    if "not found" in error_str or "does not exist" in error_str:
        return grpc.StatusCode.NOT_FOUND
    elif (
        "permission" in error_str
        or "unauthorized" in error_str
        or "access denied" in error_str
    ):
        return grpc.StatusCode.PERMISSION_DENIED
    elif (
        "invalid" in error_str
        or "validation" in error_str
        or "valueerror" in error_type
    ):
        return grpc.StatusCode.INVALID_ARGUMENT
    elif "timeout" in error_str or "deadline" in error_str:
        return grpc.StatusCode.DEADLINE_EXCEEDED
    elif "rate" in error_str or "quota" in error_str or "exhausted" in error_str:
        return grpc.StatusCode.RESOURCE_EXHAUSTED
    elif "already exists" in error_str or "duplicate" in error_str:
        return grpc.StatusCode.ALREADY_EXISTS
    elif "unavailable" in error_str or "connection" in error_str:
        return grpc.StatusCode.UNAVAILABLE
    else:
        return grpc.StatusCode.INTERNAL


def check_deadline(context) -> bool:
    """Check if the request deadline has been exceeded.

    Returns True if deadline is still valid, False if exceeded.
    """
    time_remaining = context.time_remaining()
    if time_remaining is not None and time_remaining <= 0:
        logger.warning("Request deadline exceeded")
        return False
    return True


def get_correlation_id(context) -> str:
    """Extract or generate a correlation ID for request tracing."""
    metadata = (
        dict(context.invocation_metadata()) if context.invocation_metadata() else {}
    )
    correlation_id = metadata.get("x-correlation-id", metadata.get("x-request-id", ""))
    if not correlation_id:
        correlation_id = str(uuid.uuid4())[:8]
    return correlation_id


def extract_chat_config(request) -> dict:
    """Extract chat configuration from request."""
    config = {}
    if request.HasField("config"):
        cfg = request.config
        if cfg.HasField("temperature"):
            config["temperature"] = cfg.temperature
        if cfg.HasField("max_tokens"):
            config["max_tokens"] = cfg.max_tokens
        if cfg.HasField("use_rag"):
            config["use_rag"] = cfg.use_rag
        if cfg.HasField("model"):
            config["model"] = cfg.model
        if cfg.HasField("context_limit"):
            config["context_limit"] = cfg.context_limit
    return config if config else None


class ChatService(intelligence_pb2_grpc.ChatServicer):
    """Chat service. Delegating to Engine."""

    def __init__(self, engine):
        self.engine = engine

    async def SendMessage(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.ChatResponse()

            config = extract_chat_config(request)
            logger.debug(
                f"[{correlation_id}] SendMessage: user={request.user_id}, conv={request.conversation_id}"
            )
            return await self.engine.send_message(
                user_id=request.user_id,
                conversation_id=request.conversation_id
                if request.conversation_id
                else None,
                message=request.message,
                metadata=dict(request.metadata) if request.metadata else None,
                config=config,
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] SendMessage failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"SendMessage error: {str(e)}")
            return intelligence_pb2.ChatResponse()

    async def StreamChat(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return

            config = extract_chat_config(request)
            logger.debug(
                f"[{correlation_id}] StreamChat: user={request.user_id}, conv={request.conversation_id}"
            )
            async for chunk in self.engine.stream_chat(
                user_id=request.user_id,
                conversation_id=request.conversation_id
                if request.conversation_id
                else None,
                message=request.message,
                metadata=dict(request.metadata) if request.metadata else None,
                config=config,
            ):
                # Check deadline during streaming
                if not check_deadline(context):
                    logger.warning(
                        f"[{correlation_id}] StreamChat deadline exceeded mid-stream"
                    )
                    yield intelligence_pb2.ChatStreamChunk(
                        conversation_id=request.conversation_id or "",
                        message_id="",
                        error="DEADLINE_EXCEEDED: Request deadline exceeded during streaming",
                        is_final=True,
                    )
                    return
                yield chunk
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] StreamChat failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"StreamChat error: {str(e)}")

    async def GetConversation(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.ConversationResponse()

            logger.debug(
                f"[{correlation_id}] GetConversation: user={request.user_id}, conv={request.conversation_id}"
            )
            return await self.engine.get_conversation(
                user_id=request.user_id,
                conversation_id=request.conversation_id,
                limit=request.limit or 100,
                cursor=request.cursor if request.cursor else None,
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(
                f"[{correlation_id}] GetConversation failed: {e}", exc_info=True
            )
            context.set_code(status_code)
            context.set_details(f"GetConversation error: {str(e)}")
            return intelligence_pb2.ConversationResponse()

    async def DeleteConversation(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.DeleteConversationResponse(
                    success=False, conversation_id=request.conversation_id
                )

            logger.debug(
                f"[{correlation_id}] DeleteConversation: user={request.user_id}, conv={request.conversation_id}"
            )
            success = await self.engine.delete_conversation(
                user_id=request.user_id, conversation_id=request.conversation_id
            )
            return intelligence_pb2.DeleteConversationResponse(
                success=success, conversation_id=request.conversation_id
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(
                f"[{correlation_id}] DeleteConversation failed: {e}", exc_info=True
            )
            context.set_code(status_code)
            context.set_details(f"DeleteConversation error: {str(e)}")
            return intelligence_pb2.DeleteConversationResponse(
                success=False, conversation_id=request.conversation_id
            )

    async def GenerateTitle(self, request, context):
        """Generate a conversation title using AI."""
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.GenerateTitleResponse(title="")

            logger.debug(
                f"[{correlation_id}] GenerateTitle: conv={request.conversation_id}"
            )

            # Delegate to engine for AI title generation
            title = await self.engine.generate_title(
                conversation_id=request.conversation_id,
                user_message=request.user_message,
                assistant_message=request.assistant_message,
            )

            return intelligence_pb2.GenerateTitleResponse(title=title)
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] GenerateTitle failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"GenerateTitle error: {str(e)}")
            return intelligence_pb2.GenerateTitleResponse(title="")
