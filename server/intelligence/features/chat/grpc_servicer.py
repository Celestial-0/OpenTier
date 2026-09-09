"""gRPC Servicer adapter for Chat interactions."""

from __future__ import annotations

import logging
import grpc

from generated import intelligence_pb2, intelligence_pb2_grpc
from shared.grpc.errors import classify_grpc_error
from shared.grpc.context import check_deadline, get_correlation_id
from features.chat.service import ChatService

logger = logging.getLogger(__name__)


def extract_chat_config(request) -> dict | None:
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


class ChatServicer(intelligence_pb2_grpc.ChatServicer):
    """Chat service gRPC adapter."""

    def __init__(self, service: ChatService) -> None:
        self.service = service

    async def SendMessage(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.ChatResponse()

            config = extract_chat_config(request)
            logger.debug(
                "[%s] SendMessage: user=%s, conv=%s, rag=%s",
                correlation_id,
                request.user_id,
                request.conversation_id,
                config.get("use_rag") if config else True,
            )

            return await self.service.send_message(
                user_id=request.user_id,
                conversation_id=request.conversation_id if request.conversation_id else None,
                message=request.message,
                metadata=dict(request.metadata) if request.metadata else None,
                config=config,
                correlation_id=correlation_id,
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error("[%s] SendMessage failed: %s", correlation_id, e, exc_info=True)
            context.set_code(status_code)
            context.set_details(f"Chat error: {str(e)}")
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
                "[%s] StreamChat: user=%s, conv=%s, rag=%s",
                correlation_id,
                request.user_id,
                request.conversation_id,
                config.get("use_rag") if config else True,
            )

            async for chunk in self.service.stream_chat(
                user_id=request.user_id,
                conversation_id=request.conversation_id if request.conversation_id else None,
                message=request.message,
                metadata=dict(request.metadata) if request.metadata else None,
                config=config,
                correlation_id=correlation_id,
            ):
                if not check_deadline(context):
                    logger.warning("[%s] StreamChat client disconnected", correlation_id)
                    context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                    context.set_details("Client deadline exceeded during streaming")
                    return
                yield chunk

        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error("[%s] StreamChat failed: %s", correlation_id, e, exc_info=True)
            context.set_code(status_code)
            context.set_details(f"Stream error: {str(e)}")

    async def GenerateTitle(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.GenerateTitleResponse(
                    title="New Conversation"
                )

            logger.debug(
                "[%s] GenerateTitle: conv=%s", correlation_id, request.conversation_id
            )
            title = await self.service.generate_title(
                conversation_id=request.conversation_id,
                first_message=request.first_message,
                user_id=request.user_id if hasattr(request, "user_id") else "",
            )
            return intelligence_pb2.GenerateTitleResponse(title=title)
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error("[%s] GenerateTitle failed: %s", correlation_id, e, exc_info=True)
            context.set_code(status_code)
            context.set_details(f"GenerateTitle error: {str(e)}")
            return intelligence_pb2.GenerateTitleResponse(
                title="New Conversation"
            )


__all__ = ["ChatServicer", "extract_chat_config"]
