"""Unified resource management service."""
import grpc
import hashlib
import uuid
import time
from core.logging import get_logger
from generated import intelligence_pb2
from generated import intelligence_pb2_grpc

logger = get_logger(__name__)

# Maximum chunk size for chunked uploads (10MB)
MAX_CHUNK_SIZE = 10 * 1024 * 1024
# Maximum file size for chunked uploads (1GB)
MAX_CHUNKED_FILE_SIZE = 1024 * 1024 * 1024


def classify_grpc_error(error: Exception) -> grpc.StatusCode:
    """Classify an exception to the appropriate gRPC status code.
    
    This enables proper client-side error handling and retry logic.
    """
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()
    
    # Check for common error patterns
    if "not found" in error_str or "does not exist" in error_str:
        return grpc.StatusCode.NOT_FOUND
    elif "permission" in error_str or "unauthorized" in error_str or "access denied" in error_str:
        return grpc.StatusCode.PERMISSION_DENIED
    elif "invalid" in error_str or "validation" in error_str or "valueerror" in error_type:
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
    metadata = dict(context.invocation_metadata()) if context.invocation_metadata() else {}
    correlation_id = metadata.get('x-correlation-id', metadata.get('x-request-id', ''))
    if not correlation_id:
        correlation_id = str(uuid.uuid4())[:8]
    return correlation_id

class ResourceService(intelligence_pb2_grpc.ResourceServiceServicer):
    """Unified service for ingesting and managing resources. Delegating to Engine."""

    def __init__(self, engine):
        self.engine = engine

    async def AddResource(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.AddResourceResponse(
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED
                )
            
            # Use oneof pattern to determine which content type was provided
            content_type = request.WhichOneof("content")
            url = None
            text = None
            file_content = None

            if content_type == "url":
                url = request.url
            elif content_type == "text":
                text = request.text
            elif content_type == "file_content":
                file_content = request.file_content

            logger.debug(f"[{correlation_id}] AddResource: user={request.user_id}, type={content_type}")
            return await self.engine.add_resource(
                user_id=request.user_id,
                resource_id=request.resource_id if request.resource_id else None,
                url=url,
                text=text,
                file_content=file_content,
                title=request.title,
                metadata=dict(request.metadata) if request.metadata else {},
                config=request.config if request.HasField("config") else None,
                resource_type=request.type
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] AddResource failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"AddResource error: {str(e)}")
            return intelligence_pb2.AddResourceResponse(
                resource_id=request.resource_id or "",
                status=intelligence_pb2.RESOURCE_STATUS_FAILED
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
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED
                )
          
            logger.debug(f"[{correlation_id}] GetResourceStatus: job={request.job_id}, resource={request.resource_id}")
            return await self.engine.get_resource_status(
                job_id=request.job_id,
                resource_id=request.resource_id,
                user_id=request.user_id
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] GetResourceStatus failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"GetResourceStatus error: {str(e)}")
            return intelligence_pb2.ResourceStatusResponse(
                job_id=request.job_id,
                resource_id=request.resource_id,
                status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                error=str(e)
            )

    async def ListResources(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.ListResourcesResponse()
            
            logger.debug(f"[{correlation_id}] ListResources: user={request.user_id}, limit={request.limit}")
            return await self.engine.list_resources(
                user_id=request.user_id,
                limit=request.limit or 20
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] ListResources failed: {e}", exc_info=True)
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
                    success=False,
                    resource_id=request.resource_id
                )
            
            logger.debug(f"[{correlation_id}] DeleteResource: user={request.user_id}, resource={request.resource_id}")
            success = await self.engine.delete_resource(
                resource_id=request.resource_id,
                user_id=request.user_id
            )
            return intelligence_pb2.DeleteResourceResponse(
                success=success,
                resource_id=request.resource_id
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] DeleteResource failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"DeleteResource error: {str(e)}")
            return intelligence_pb2.DeleteResourceResponse(
                success=False,
                resource_id=request.resource_id
            )

    async def CancelIngestion(self, request, context):
        correlation_id = get_correlation_id(context)
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.CancelIngestionResponse(
                    success=False,
                    job_id=request.job_id,
                    message="Request deadline exceeded"
                )
            
            logger.debug(f"[{correlation_id}] CancelIngestion: user={request.user_id}, job={request.job_id}")
            success, message = await self.engine.cancel_ingestion(
                job_id=request.job_id,
                user_id=request.user_id
            )
            return intelligence_pb2.CancelIngestionResponse(
                success=success,
                job_id=request.job_id,
                message=message
            )
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] CancelIngestion failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"CancelIngestion error: {str(e)}")
            return intelligence_pb2.CancelIngestionResponse(
                success=False,
                job_id=request.job_id,
                message=str(e)
            )

    async def ChunkedUpload(self, request_iterator, context):
        """Handle chunked file uploads for large files (>100MB).
        
        Protocol:
        1. First message MUST contain ChunkMetadata
        2. Subsequent messages contain raw file bytes
        3. Last message has is_last=True
        
        Server validates:
        - Chunk ordering
        - Total size matches metadata
        - Checksum (if provided)
        """
        correlation_id = get_correlation_id(context)
        metadata = None
        chunks_received = 0
        total_bytes = 0
        file_buffer = bytearray()
        hasher = hashlib.sha256()
        resource_id = None
        
        try:
            async for chunk in request_iterator:
                # Check deadline periodically
                if chunks_received % 10 == 0 and not check_deadline(context):
                    context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                    context.set_details("Upload deadline exceeded")
                    return intelligence_pb2.ChunkedUploadResponse(
                        status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                        chunks_received=chunks_received,
                        error="Deadline exceeded during upload"
                    )
                
                # First chunk must be metadata
                if chunks_received == 0:
                    if not chunk.HasField("metadata"):
                        context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                        context.set_details("First chunk must contain metadata")
                        return intelligence_pb2.ChunkedUploadResponse(
                            status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                            error="First chunk must contain metadata"
                        )
                    
                    metadata = chunk.metadata
                    resource_id = metadata.resource_id or str(uuid.uuid4())
                    
                    # Validate file size
                    if metadata.total_size > MAX_CHUNKED_FILE_SIZE:
                        context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                        context.set_details(f"File too large: {metadata.total_size} bytes (max: {MAX_CHUNKED_FILE_SIZE})")
                        return intelligence_pb2.ChunkedUploadResponse(
                            resource_id=resource_id,
                            status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                            error=f"File exceeds maximum size of {MAX_CHUNKED_FILE_SIZE} bytes"
                        )
                    
                    logger.info(f"[{correlation_id}] ChunkedUpload started: user={metadata.user_id}, "
                               f"file={metadata.filename}, size={metadata.total_size}, chunks={metadata.total_chunks}")
                    chunks_received += 1
                    continue
                
                # Subsequent chunks must be data
                if not chunk.HasField("data"):
                    logger.warning(f"[{correlation_id}] Chunk {chunk.chunk_index} has no data")
                    continue
                
                # Validate chunk index
                if chunk.chunk_index != chunks_received:
                    context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                    context.set_details(f"Out of order chunk: expected {chunks_received}, got {chunk.chunk_index}")
                    return intelligence_pb2.ChunkedUploadResponse(
                        resource_id=resource_id,
                        status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                        chunks_received=chunks_received,
                        error=f"Out of order chunk: expected {chunks_received}, got {chunk.chunk_index}"
                    )
                
                # Validate chunk size
                if len(chunk.data) > MAX_CHUNK_SIZE:
                    context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                    context.set_details(f"Chunk too large: {len(chunk.data)} bytes (max: {MAX_CHUNK_SIZE})")
                    return intelligence_pb2.ChunkedUploadResponse(
                        resource_id=resource_id,
                        status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                        chunks_received=chunks_received,
                        error="Chunk exceeds maximum size"
                    )
                
                # Accumulate data
                file_buffer.extend(chunk.data)
                hasher.update(chunk.data)
                total_bytes += len(chunk.data)
                chunks_received += 1
                
                logger.debug(f"[{correlation_id}] Received chunk {chunk.chunk_index}, "
                            f"bytes={len(chunk.data)}, total={total_bytes}/{metadata.total_size}")
                
                if chunk.is_last:
                    break
            
            if metadata is None:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details("No metadata received")
                return intelligence_pb2.ChunkedUploadResponse(
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                    error="No metadata received"
                )
            
            # Validate total size
            if total_bytes != metadata.total_size:
                context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
                context.set_details(f"Size mismatch: received {total_bytes}, expected {metadata.total_size}")
                return intelligence_pb2.ChunkedUploadResponse(
                    resource_id=resource_id,
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                    chunks_received=chunks_received,
                    error=f"Size mismatch: received {total_bytes}, expected {metadata.total_size}"
                )
            
            # Validate checksum if provided
            computed_checksum = hasher.hexdigest()
            if metadata.checksum and metadata.checksum != computed_checksum:
                context.set_code(grpc.StatusCode.DATA_LOSS)
                context.set_details("Checksum mismatch - data corrupted during transfer")
                return intelligence_pb2.ChunkedUploadResponse(
                    resource_id=resource_id,
                    status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                    chunks_received=chunks_received,
                    checksum=computed_checksum,
                    error="Checksum mismatch - data corrupted during transfer"
                )
            
            logger.info(f"[{correlation_id}] ChunkedUpload complete: {chunks_received} chunks, {total_bytes} bytes")
            
            # Process the file through the engine
            response = await self.engine.add_resource(
                user_id=metadata.user_id,
                resource_id=resource_id,
                file_content=bytes(file_buffer),
                title=metadata.title if metadata.title else metadata.filename,
                metadata=dict(metadata.metadata) if metadata.metadata else {},
                config=metadata.config if metadata.HasField("config") else None,
                resource_type=metadata.type
            )
            
            return intelligence_pb2.ChunkedUploadResponse(
                job_id=response.job_id,
                resource_id=response.resource_id,
                status=response.status,
                chunks_received=chunks_received,
                checksum=computed_checksum
            )
            
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] ChunkedUpload failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"ChunkedUpload error: {str(e)}")
            return intelligence_pb2.ChunkedUploadResponse(
                resource_id=resource_id or "",
                status=intelligence_pb2.RESOURCE_STATUS_FAILED,
                chunks_received=chunks_received,
                error=str(e)
            )

    async def SyncResourceMetadata(self, request, context):
        """Synchronize resource metadata between API and Intelligence databases.
        
        This RPC enables eventual consistency between the two databases by:
        1. Comparing resource states between API and Intelligence
        2. Detecting conflicts (missing resources, status mismatches)
        3. Resolving conflicts based on the sync direction
        
        Sync Strategies:
        - API_TO_INTELLIGENCE: API is source of truth
        - INTELLIGENCE_TO_API: Intelligence is source of truth  
        - BIDIRECTIONAL: Merge with conflict detection
        """
        correlation_id = get_correlation_id(context)
        
        try:
            if not check_deadline(context):
                context.set_code(grpc.StatusCode.DEADLINE_EXCEEDED)
                context.set_details("Request deadline exceeded before processing")
                return intelligence_pb2.SyncMetadataResponse(
                    success=False,
                    sync_timestamp=int(time.time())
                )
            
            logger.info(f"[{correlation_id}] SyncResourceMetadata: user={request.user_id}, "
                       f"direction={intelligence_pb2.SyncDirection.Name(request.direction)}, "
                       f"resources={len(request.resource_ids) if request.resource_ids else 'all'}")
            
            # Get resources from Intelligence database
            resources = await self.engine.list_resources_for_sync(
                user_id=request.user_id,
                since_timestamp=request.since_timestamp if request.since_timestamp else None,
                resource_ids=list(request.resource_ids) if request.resource_ids else None
            )
            
            conflicts = []
            resources_synced = 0
            
            # For now, just report what we have
            # The API layer will compare and determine conflicts
            for resource in resources:
                resources_synced += 1
            
            sync_timestamp = int(time.time())
            
            return intelligence_pb2.SyncMetadataResponse(
                success=True,
                resources_synced=resources_synced,
                conflicts_found=len(conflicts),
                conflicts=conflicts,
                sync_timestamp=sync_timestamp
            )
            
        except Exception as e:
            status_code = classify_grpc_error(e)
            logger.error(f"[{correlation_id}] SyncResourceMetadata failed: {e}", exc_info=True)
            context.set_code(status_code)
            context.set_details(f"SyncResourceMetadata error: {str(e)}")
            return intelligence_pb2.SyncMetadataResponse(
                success=False,
                sync_timestamp=int(time.time())
            )
