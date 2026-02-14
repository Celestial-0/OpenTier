"""Document processor for ingestion pipeline."""

import uuid
# from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from engine.ingestion.cleaning import (
    CleaningStrategy,
    DocumentType,
    clean_with_strategy,
)
from engine.ingestion.chunker import TextChunk, chunk_text
from engine.ingestion.storage import DocumentStorage, JobStorage
from engine.ingestion.validation import (
    ValidationError,
    sanitize_metadata,
    validate_content_length,
    validate_document_title,
    validate_user_id,
)
from core.config import get_config
from core.logging import get_logger
from generated import intelligence_pb2
from engine.embedding import batch_generate_embeddings
from engine.embedding.storage import EmbeddingStorage

logger = get_logger(__name__)


class DocumentProcessor:
    """Processes documents through the ingestion pipeline."""

    def __init__(
        self,
        doc_storage: DocumentStorage,
        job_storage: JobStorage,
        session: AsyncSession,
    ):
        self.doc_storage = doc_storage
        self.job_storage = job_storage
        self.session = session
        self.embedding_storage = EmbeddingStorage(session)
        self.config = get_config()

    async def process_document(
        self,
        user_id: str,
        document: intelligence_pb2.Document,
        config: intelligence_pb2.IngestionConfig | None = None,
        job_id: uuid.UUID | None = None,
        is_global: bool = False,
    ) -> tuple[uuid.UUID, list[TextChunk]]:
        """
        Process a single document through the pipeline.

        Args:
            user_id: User ID
            document: Document proto message
            config: Optional ingestion config
            job_id: Optional job ID for tracking

        Returns:
            Tuple of (document_id, chunks)

        Raises:
            ValidationError: If input validation fails
            Exception: If processing fails
        """
        try:
            # Validate inputs
            validate_user_id(user_id)

            if not document.content:
                raise ValidationError("Document content cannot be empty")

            # Validate and sanitize title
            try:
                title = (
                    validate_document_title(document.title)
                    if document.title
                    else "Untitled"
                )
            except ValidationError as e:
                logger.warning(f"Title validation failed, using 'Untitled': {e}")
                title = "Untitled"

            # Validate content length before processing
            validate_content_length(document.content)

            logger.info(
                f"Processing document for user {user_id}: '{title}' "
                f"({len(document.content):,} chars)"
            )
            # Get config values
            chunk_size = (
                config.chunk_size
                if config and config.chunk_size
                else self.config.ingestion.chunk_size
            )
            chunk_overlap = (
                config.chunk_overlap
                if config and config.chunk_overlap
                else self.config.ingestion.chunk_overlap
            )
            auto_clean = (
                config.auto_clean
                if config and config.HasField("auto_clean")
                else self.config.ingestion.auto_clean
            )

            # Clean content if requested with production-grade cleaning
            content = document.content
            cleaning_metrics = None

            if auto_clean:
                # Map protobuf document type to DocumentType enum
                doc_type_map = {
                    intelligence_pb2.DOCUMENT_TYPE_TEXT: DocumentType.TEXT,
                    intelligence_pb2.DOCUMENT_TYPE_MARKDOWN: DocumentType.MARKDOWN,
                    intelligence_pb2.DOCUMENT_TYPE_HTML: DocumentType.HTML,
                    intelligence_pb2.DOCUMENT_TYPE_PDF: DocumentType.PDF,
                    intelligence_pb2.DOCUMENT_TYPE_CODE: DocumentType.CODE,
                }

                # Default to TEXT type for unknown or URL types (don't use DOCUMENT_TYPE_URL as it doesn't exist)
                doc_type = doc_type_map.get(document.type, DocumentType.TEXT)

                # Apply production-grade cleaning with STANDARD strategy
                content, cleaning_metrics = clean_with_strategy(
                    content,
                    document_type=doc_type,
                    strategy=CleaningStrategy.STANDARD,
                )

                # Log cleaning metrics
                if cleaning_metrics:
                    logger.info(
                        f"Cleaned document: {cleaning_metrics.chars_removed} chars removed "
                        f"({cleaning_metrics.reduction_percent:.1f}%), "
                        f"{cleaning_metrics.html_tags_removed} HTML tags removed"
                    )

            # Create document in database
            try:
                doc_id = uuid.UUID(document.id) if document.id else None
                try:
                    doc_type = intelligence_pb2.DocumentType.Name(document.type)
                except ValueError:
                    doc_type = "UNKNOWN"

                # Store job_id in metadata for status tracking
                doc_metadata = (
                    sanitize_metadata(dict(document.metadata))
                    if document.metadata
                    else {}
                )
                if job_id:
                    doc_metadata["job_id"] = str(job_id)

                db_doc = await self.doc_storage.create_document(
                    user_id=user_id,
                    title=title,
                    content=content,
                    document_type=doc_type,
                    source_url=document.source_url if document.source_url else None,
                    metadata=doc_metadata,
                    document_id=doc_id,
                    is_global=is_global,
                )
                logger.debug(f"Created document in database: {db_doc.id}")
            except Exception as e:
                logger.error(f"Failed to create document in database: {e}")
                raise

            # Chunk the content
            try:
                chunks = chunk_text(
                    content,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                    metadata={"document_id": str(db_doc.id), "title": title},
                )
                logger.info(f"Created {len(chunks)} chunks for document {db_doc.id}")
            except Exception as e:
                logger.error(f"Failed to chunk document: {e}")
                # Clean up created document
                await self.doc_storage.delete_document(db_doc.id)
                raise

            # Store chunks in database
            chunk_objects = []
            chunk_texts = []

            try:
                for chunk in chunks:
                    chunk_obj = await self.doc_storage.create_chunk(
                        document_id=db_doc.id,
                        content=chunk.content,
                        chunk_index=chunk.index,
                        metadata=chunk.metadata,
                    )
                    chunk_objects.append(chunk_obj)
                    chunk_texts.append(chunk.content)

                logger.debug(f"Stored {len(chunks)} chunks in database")

                # Generate and store embeddings
                logger.info(f"Generating embeddings for {len(chunks)} chunks...")
                embeddings = await batch_generate_embeddings(chunk_texts)

                for i, chunk in enumerate(chunk_objects):
                    chunk.embedding = embeddings[i].tolist()

                await self.session.flush()
                logger.info(
                    f"Stored {len(embeddings)} embeddings for document {db_doc.id}"
                )

            except Exception as e:
                logger.error(f"Failed to store chunks or embeddings: {e}")
                # Clean up created document and chunks
                await self.doc_storage.delete_document(db_doc.id)
                raise

            # Update job progress if job_id provided
            if job_id:
                await self.job_storage.increment_processed(job_id)

            logger.info(
                f"Successfully processed document {db_doc.id}: "
                f"{len(chunks)} chunks, {len(content):,} chars"
            )
            return db_doc.id, chunks

        except ValidationError as e:
            logger.error(f"Validation error processing document: {e}")
            if job_id:
                await self.job_storage.increment_failed(
                    job_id, f"Validation error: {e}"
                )
            raise
        except Exception as e:
            logger.error(f"Error processing document: {e}", exc_info=True)
            # Update job with error if job_id provided
            if job_id:
                await self.job_storage.increment_failed(job_id, str(e))
            raise

    async def process_batch(
        self,
        user_id: str,
        documents: list[intelligence_pb2.Document],
        config: intelligence_pb2.IngestionConfig | None = None,
        is_global: bool = False,
    ) -> uuid.UUID:
        """
        Process a batch of documents.

        Args:
            user_id: User ID
            documents: List of document proto messages
            config: Optional ingestion config

        Returns:
            Job ID for tracking
        """
        # Create job
        job = await self.job_storage.create_job(
            user_id=user_id, total_documents=len(documents)
        )

        # Update job status to processing
        await self.job_storage.update_job_status(job.id, status="processing")

        # Process each document
        for document in documents:
            try:
                await self.process_document(
                    user_id, document, config, job_id=job.id, is_global=is_global
                )
            except Exception as e:
                # Error already logged in process_document
                logger.error(f"Error processing document {document.title}: {e}")
                continue

        # Complete job
        await self.job_storage.complete_job(job.id)

        return job.id
