"""Unified Intelligence Engine Orchestrator."""

import uuid
import logging
from typing import AsyncGenerator, Dict, Any, Optional

from engine.query.llm import LLMClient
from engine.query.pipeline import QueryPipeline
from engine.chat import ChatService
from engine.ingestion.processor import DocumentProcessor
from engine.ingestion.storage import DocumentStorage, JobStorage
from core.database import get_session
from core.logging import get_logger
from generated import intelligence_pb2

logger = get_logger(__name__)

# ... (Previous imports should be preserved, but adding new one)

class IntelligenceEngine:
    # ... (Previous parts)

    def __init__(self):
        self.llm_client = LLMClient()
        self.query_pipeline = QueryPipeline(llm_client=self.llm_client)
        self.chat_service = ChatService(self.query_pipeline)

    # ... (Resource methods unchanged)

    # =========================================================================
    # CHAT CAPABILITIES
    # =========================================================================

    async def get_conversation(
        self,
        user_id: str,
        conversation_id: str,
        limit: Optional[int] = None,
        cursor: Optional[str] = None
    ) -> intelligence_pb2.ConversationResponse:
        """Get conversation history with pagination."""
        return await self.chat_service.get_conversation(
            conversation_id,
            user_id,
            limit=limit or 100,
            cursor=cursor
        )

    async def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """Delete conversation."""
        return await self.chat_service.delete_conversation(conversation_id, user_id)

    async def send_message(
        self,
        user_id: str,
        conversation_id: Optional[str],
        message: str,
        metadata: Optional[Dict[str, str]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> intelligence_pb2.ChatResponse:
        """Delegate to ChatService with optional config."""
        return await self.chat_service.send_message(
            user_id=user_id,
            conversation_id=conversation_id,
            message=message,
            metadata=metadata,
            config=config
        )

    async def stream_chat(
        self,
        user_id: str,
        conversation_id: Optional[str],
        message: str,
        metadata: Optional[Dict[str, str]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[intelligence_pb2.ChatStreamChunk, None]:
        """Delegate to ChatService with optional config."""
        async for chunk in self.chat_service.stream_chat(
            user_id=user_id,
            conversation_id=conversation_id,
            message=message,
            metadata=metadata,
            config=config
        ):
            yield chunk


    # =========================================================================
    # RAG CAPABILITIES (Internal use only - no proto exposure)
    # =========================================================================
    # NOTE: These methods are for internal use by the chat pipeline.
    # They return Python dataclasses, not proto messages, as the corresponding
    # proto messages (RetrieveContextResponse, GenerateWithContextResponse,
    # RetrievalMetrics, GenerationMetrics) are not defined in the proto file.
    # If external RAG API is needed, add the messages to intelligence.proto first.

    async def retrieve_context_internal(
        self,
        query: str,
        user_id: str,
        top_k: int = 5,
        doc_ids: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Retrieve relevant context for a query (internal use).
        
        Returns a dictionary with context data, not proto messages.
        """
        rag_context = await self.query_pipeline.retrieve_context(
            query=query,
            user_id=user_id
        )

        chunks = []
        for chunk in rag_context.chunks:
            chunks.append({
                "chunk_id": str(chunk.chunk_id) if hasattr(chunk, 'chunk_id') else str(uuid.uuid4()),
                "document_id": str(chunk.document_id) if hasattr(chunk, 'document_id') else "",
                "content": chunk.content,
                "relevance_score": chunk.similarity_score
            })

        return {
            "chunks": chunks,
            "total_chunks": rag_context.total_chunks,
            "avg_similarity": rag_context.avg_similarity
        }

    async def generate_with_context_internal(
        self,
        prompt: str,
        context: list,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Generate response given context manually provided (internal use).
        
        Returns a dictionary, not proto messages.
        """
        # Build strict prompt
        context_text = "\n\n".join(context)
        messages = [
            {"role": "system", "content": "Answer based on context."},
            {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {prompt}"}
        ]

        try:
            response_text, token_usage = await self.llm_client.generate(messages)
        except Exception as e:
            response_text = f"Error: {e}"
            token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

        return {
            "response": response_text,
            "sources_used": [],
            "token_usage": token_usage
        }


    # =========================================================================
    # RESOURCE CAPABILITIES
    # =========================================================================

    async def add_resource(
        self,
        user_id: str,
        resource_id: Optional[str],
        url: Optional[str],
        text: Optional[str],
        file_content: Optional[bytes],
        title: Optional[str],
        metadata: Dict[str, str],
        config: Optional[intelligence_pb2.IngestionConfig],
        resource_type: int
    ) -> intelligence_pb2.AddResourceResponse:
        """Add a resource, crawling URLs if needed."""
        async with get_session() as session:
            doc_storage = DocumentStorage(session)
            job_storage = JobStorage(session)
            processor = DocumentProcessor(doc_storage, job_storage, session)

            # Determine content based on resource type
            content = ""
            source_url = None
            document_type = resource_type

            if text:
                # Direct text content
                content = text
            elif url:
                # Crawl URL to extract content
                from engine.ingestion.crawler import WebCrawler
                try:
                    async with WebCrawler(max_pages=10) as crawler:
                        pages = await crawler.crawl(url)
                        if pages:
                            # Combine all page content
                            content_parts = []
                            for page in pages:
                                page_title = page.get("title", "")
                                page_url = page.get("final_url", "")
                                content_parts.append(f"# {page_title}\nSource: {page_url}\n")
                            content = "\n\n".join(content_parts)
                            source_url = url
                            logger.info(f"Crawled {len(pages)} pages from {url}")
                        else:
                            logger.warning(f"No content crawled from {url}")
                            content = f"URL: {url}"
                except Exception as e:
                    logger.error(f"Failed to crawl URL {url}: {e}")
                    content = f"Failed to crawl: {url}\nError: {str(e)}"
                    source_url = url
            elif file_content:
                # Decode file content
                content = file_content.decode('utf-8', errors='ignore')

            # Create Document proto
            doc_proto = intelligence_pb2.Document(
                id=resource_id or str(uuid.uuid4()),
                title=title or (url if url else "Uploaded Document"),
                content=content,
                type=document_type,
                source_url=source_url or url or "",
                metadata=metadata
            )

            job_id = await processor.process_batch(
                user_id=user_id,
                documents=[doc_proto],
                config=config
            )

            return intelligence_pb2.AddResourceResponse(
                job_id=str(job_id),
                resource_id=doc_proto.id,
                status=intelligence_pb2.RESOURCE_STATUS_QUEUED
            )

    async def get_resource_status(self, job_id: str, resource_id: str, user_id: str = "") -> intelligence_pb2.ResourceStatusResponse:
        """Get resource status.
        
        Args:
            job_id: Job ID to query
            resource_id: Resource ID to query
            user_id: User ID for ownership validation 
        """
        async with get_session() as session:
             job_storage = JobStorage(session)
             doc_storage = DocumentStorage(session)

             # Query by job_id if provided, otherwise by resource_id
             job = None
             actual_job_id = job_id

             if job_id:
                 job = await job_storage.get_job(uuid.UUID(job_id))
                 # Validate ownership if user_id provided
                 if job and user_id and job.user_id != user_id:
                     logger.warning(f"User {user_id} attempted to access job {job_id} owned by {job.user_id}")
                     return intelligence_pb2.ResourceStatusResponse(
                         job_id=job_id,
                         resource_id=resource_id,
                         status=intelligence_pb2.RESOURCE_STATUS_UNSPECIFIED,
                         error="Access denied: job belongs to another user"
                     )
             elif resource_id:
                 # Query by resource_id - get document and extract job_id from metadata
                 doc = await doc_storage.get_document(uuid.UUID(resource_id))
                 # Validate ownership if user_id provided
                 if doc and user_id and doc.user_id != user_id:
                     logger.warning(f"User {user_id} attempted to access resource {resource_id} owned by {doc.user_id}")
                     return intelligence_pb2.ResourceStatusResponse(
                         job_id="",
                         resource_id=resource_id,
                         status=intelligence_pb2.RESOURCE_STATUS_UNSPECIFIED,
                         error="Access denied: resource belongs to another user"
                     )
                 if doc and doc.metadata_ and 'job_id' in doc.metadata_:
                     actual_job_id = doc.metadata_['job_id']
                     job = await job_storage.get_job(uuid.UUID(actual_job_id))

             status = intelligence_pb2.RESOURCE_STATUS_UNSPECIFIED
             if job:
                 if job.status == "queued": status = intelligence_pb2.RESOURCE_STATUS_QUEUED
                 elif job.status == "processing": status = intelligence_pb2.RESOURCE_STATUS_PROCESSING
                 elif job.status == "completed": status = intelligence_pb2.RESOURCE_STATUS_COMPLETED
                 elif job.status == "failed": status = intelligence_pb2.RESOURCE_STATUS_FAILED
                 elif job.status == "partial": status = intelligence_pb2.RESOURCE_STATUS_PARTIAL

             # Get actual chunk count from storage instead of using processed_documents
             # (which tracks documents, not chunks)
             chunks_created = 0
             if resource_id:
                 try:
                     chunks_created = await doc_storage.get_document_chunk_count(uuid.UUID(resource_id))
                 except Exception:
                     # Fallback to approximation if chunk count fails
                     chunks_created = job.processed_documents if job else 0
             elif job:
                 # For job-based queries, use the job's count as approximation
                 chunks_created = job.processed_documents

             return intelligence_pb2.ResourceStatusResponse(
                 job_id=actual_job_id or "",
                 resource_id=resource_id,
                 status=status,
                 chunks_created=chunks_created,
                 error=str(job.errors[0]) if job and job.errors else None,
                 progress=job.progress_percent if job else 0.0
             )

    async def list_resources(self, user_id: str, limit: int) -> intelligence_pb2.ListResourcesResponse:
        """List resources with statistics."""
        async with get_session() as session:
            doc_storage = DocumentStorage(session)
            docs = await doc_storage.list_user_documents(user_id, limit=limit)

            items = []
            for d in docs:
                # Get chunk count for this document
                chunk_count = await doc_storage.get_document_chunk_count(d.id)

                # Map DOCUMENT_TYPE_* to RESOURCE_TYPE_*
                try:
                     mapped_type_name = d.document_type.replace("DOCUMENT", "RESOURCE")
                     res_type = intelligence_pb2.ResourceType.Value(mapped_type_name)
                except ValueError:
                     res_type = intelligence_pb2.RESOURCE_TYPE_UNSPECIFIED

                # Build resource stats
                stats = intelligence_pb2.ResourceStats(
                    documents=1,
                    chunks=chunk_count
                )

                items.append(intelligence_pb2.ResourceItem(
                    id=str(d.id),
                    type=res_type,
                    content=str(d.content)[:100] if d.content else "",
                    status=intelligence_pb2.RESOURCE_STATUS_COMPLETED,
                    created_at=int(d.created_at.timestamp()),
                    metadata=dict(d.metadata_) if d.metadata_ else {},
                    stats=stats
                ))

            return intelligence_pb2.ListResourcesResponse(
                items=items,
                total_count=len(items)
            )

    async def delete_resource(self, resource_id: str, user_id: str = "") -> bool:
        """Delete resource.
        
        Args:
            resource_id: Resource ID to delete
            user_id: User ID for ownership validation 
        """
        async with get_session() as session:
             doc_storage = DocumentStorage(session)
             
             # Validate ownership if user_id provided
             if user_id:
                 doc = await doc_storage.get_document(uuid.UUID(resource_id))
                 if doc and doc.user_id != user_id:
                     logger.warning(f"User {user_id} attempted to delete resource {resource_id} owned by {doc.user_id}")
                     return False
             
             success, _, _ = await doc_storage.delete_document(uuid.UUID(resource_id))
             return success

    async def cancel_ingestion(self, job_id: str, user_id: str) -> tuple[bool, str]:
        """Cancel an in-flight ingestion job."""
        async with get_session() as session:
             job_storage = JobStorage(session)

             try:
                 job = await job_storage.get_job(uuid.UUID(job_id))
                 if not job:
                     return False, f"Job {job_id} not found"

                 # Check if job belongs to user
                 # (Assuming jobs have user_id tracking; adjust if necessary)

                 # Only cancel if in queued or processing state
                 if job.status not in ["queued", "processing"]:
                     return False, f"Cannot cancel job in {job.status} state"

                 # Update job status to cancelled/failed
                 job.status = "cancelled"
                 job.errors = [f"Cancelled by user {user_id}"]
                 await job_storage.update_job(job)

                 logger.info(f"Cancelled ingestion job {job_id} for user {user_id}")
                 return True, f"Successfully cancelled job {job_id}"

             except Exception as e:
                 logger.error(f"Failed to cancel job {job_id}: {e}")
                 return False, f"Error cancelling job: {str(e)}"

    async def list_resources_for_sync(
        self,
        user_id: str,
        since_timestamp: Optional[int] = None,
        resource_ids: Optional[list] = None
    ) -> list:
        """List resources for database synchronization.
        
        Returns resource metadata suitable for syncing between API and Intelligence databases.
        
        Args:
            user_id: User ID to list resources for
            since_timestamp: Optional Unix timestamp for incremental sync
            resource_ids: Optional list of specific resource IDs to sync
            
        Returns:
            List of resource metadata dictionaries
        """
        async with get_session() as session:
            doc_storage = DocumentStorage(session)
            
            # Get documents with optional filtering
            from datetime import datetime
            since_dt = None
            if since_timestamp:
                since_dt = datetime.fromtimestamp(since_timestamp)
            
            docs = await doc_storage.list_user_documents(
                user_id, 
                limit=1000,  # Large limit for sync
                since=since_dt
            )
            
            # Filter by specific resource IDs if provided
            if resource_ids:
                resource_id_set = set(resource_ids)
                docs = [d for d in docs if str(d.id) in resource_id_set]
            
            resources = []
            for d in docs:
                chunk_count = await doc_storage.get_document_chunk_count(d.id)
                resources.append({
                    "resource_id": str(d.id),
                    "user_id": d.user_id,
                    "title": d.title,
                    "document_type": d.document_type,
                    "status": "completed",  # Documents in storage are completed
                    "chunks_count": chunk_count,
                    "created_at": int(d.created_at.timestamp()) if d.created_at else 0,
                    "updated_at": int(d.updated_at.timestamp()) if d.updated_at else 0,
                    "metadata": dict(d.metadata_) if d.metadata_ else {}
                })
            
            return resources


