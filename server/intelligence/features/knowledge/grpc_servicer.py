"""gRPC Servicer adapter for Knowledge resources."""

from __future__ import annotations

import logging
import grpc

from generated import intelligence_pb2, intelligence_pb2_grpc
from shared.grpc.errors import classify_grpc_error
from shared.grpc.context import check_deadline, get_correlation_id
from features.knowledge.service import KnowledgeService

logger = logging.getLogger(__name__)


class ResourceService(intelligence_pb2_grpc.ResourceServiceServicer):
    """Unified service for ingesting and managing resources."""

    def __init__(self, service: KnowledgeService) -> None:
        self.service = service

    async def AddResource(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.AddResourceResponse(
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED
                )

            content_type = request.WhichOneof("content")
            url = request.url if content_type == "url" else None
            text = request.text if content_type == "text" else None
            file_content = request.file_content if content_type == "file_content" else None

            logger.debug(
                "[%s] AddResource: user=%s, type=%s",
                correlation_id,
                request.user_id,
                content_type,
            )
            return await self.service.add_resource(
                user_id=request.user_id,
                resource_id=request.resource_id if request.resource_id else None,
                url=url,
                text=text,
                file_content=file_content,
                title=request.title,
                metadata=dict(request.metadata) if request.metadata else {},
                config=request.config if request.HasField("config") else None,
                resource_type=request.type,
                is_global=request.is_global,
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error("[%s] AddResource failed: %s", correlation_id, e, exc_info=True)
            context.set_code(status_code)
            context.set_details(f"AddResource error: {str(e)}")
            return intelligence_pb2.AddResourceResponse(
                resource_id=request.resource_id or "",
                status=intelligence_pb2.RESOURCE_STATUS_FAILED,
            )

    async def GetResourceStatus(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.ResourceStatusResponse(
                    job_id=request.job_id,
                    resource_id=request.resource_id,
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                )

            logger.debug(
                "[%s] GetResourceStatus: job=%s, resource=%s",
                correlation_id,
                request.job_id,
                request.resource_id,
            )
            return await self.service.get_resource_status(
                job_id=request.job_id,
                resource_id=request.resource_id,
                user_id=request.user_id,
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(
                "[%s] GetResourceStatus failed: %s", correlation_id, e, exc_info=True
            )
            context.set_code(status_code)
            context.set_details(f"GetResourceStatus error: {str(e)}")
            return intelligence_pb2.ResourceStatusResponse(
                job_id=request.job_id,
                resource_id=request.resource_id,
                status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                error=str(e),
            )

    async def ListResources(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.ListResourcesResponse()

            logger.debug(
                "[%s] ListResources: user=%s, limit=%s",
                correlation_id,
                request.user_id,
                request.limit,
            )
            return await self.service.list_resources(
                user_id=request.user_id,
                limit=request.limit or 20,
                cursor=request.cursor or None,
                type_filter=request.type_filter or None,
                status_filter=request.status_filter or None,
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error("[%s] ListResources failed: %s", correlation_id, e, exc_info=True)
            context.set_code(status_code)
            context.set_details(f"ListResources error: {str(e)}")
            return intelligence_pb2.ListResourcesResponse()

    async def DeleteResource(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.DeleteResourceResponse(
                    success=False, resource_id=request.resource_id
                )

            logger.debug(
                "[%s] DeleteResource: user=%s, resource=%s",
                correlation_id,
                request.user_id,
                request.resource_id,
            )
            success = await self.service.delete_resource(
                resource_id=request.resource_id, user_id=request.user_id
            )
            return intelligence_pb2.DeleteResourceResponse(
                success=success, resource_id=request.resource_id
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(
                "[%s] DeleteResource failed: %s", correlation_id, e, exc_info=True
            )
            context.set_code(status_code)
            context.set_details(f"DeleteResource error: {str(e)}")
            return intelligence_pb2.DeleteResourceResponse(
                success=False, resource_id=request.resource_id
            )

    async def ReembedAll(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            logger.info("[%s] ReembedAll requested (model=%s)", correlation_id, request.model_slug or "<default>")
            return await self.service.reembed_all(model_slug=request.model_slug or None)
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error("[%s] ReembedAll failed: %s", correlation_id, e, exc_info=True)
            context.set_code(status_code)
            context.set_details(f"ReembedAll error: {str(e)}")
            return intelligence_pb2.ReembedAllResponse(
                reembedded_chunks=0,
                dimensions=0,
                model_slug=request.model_slug or "",
                status=f"failed: {str(e)}",
            )


__all__ = ["ResourceService"]
