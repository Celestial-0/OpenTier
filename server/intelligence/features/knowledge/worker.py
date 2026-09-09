"""Ingestion background worker handlers."""

from __future__ import annotations

import logging
import os
import uuid

import redis.asyncio as aioredis
from sqlalchemy import text

from generated import intelligence_pb2
from shared.database.session import get_session
from shared.redis.dedupe import Deduper
from features.knowledge.repository import DocumentRepository, JobRepository
from features.knowledge.pipeline.processor import DocumentProcessor
from features.knowledge.queue import (
    decode_params,
    find_stuck_jobs,
    load_params,
    publish_job,
)

logger = logging.getLogger(__name__)

_dedupe: Deduper | None = None


def get_dedupe() -> Deduper:
    global _dedupe
    if _dedupe is None:
        url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        client = aioredis.from_url(url, decode_responses=False)
        _dedupe = Deduper(client)
    return _dedupe


async def handle_ingestion_job(envelope, msg_id: str) -> None:
    job_id = str(envelope.payload.get("job_id", "")).strip()
    if not job_id:
        raise ValueError(f"ingestion event {msg_id} missing job_id")

    dedupe = get_dedupe()
    claimed = await dedupe.claim(f"ingestion:{job_id}")
    if not claimed:
        async with get_session() as s:
            row = (
                await s.execute(
                    text("SELECT status FROM ingestion_jobs WHERE id = :id"),
                    {"id": job_id},
                )
            ).scalar_one_or_none()
        if row == "completed":
            logger.info("job %s already completed; skipping", job_id)
            return
        logger.warning("stale dedupe claim on %s; re-processing", job_id)

    try:
        await execute_ingestion(job_id, msg_id)
    except Exception:
        await dedupe.release(f"ingestion:{job_id}")
        logger.error("ingestion job %s failed", job_id, exc_info=True)
        raise
    logger.info("job %s processed (stream msg %s)", job_id, msg_id)


async def execute_ingestion(job_id: str, msg_id: str) -> None:
    async with get_session() as session:
        params = await load_params(session, job_id)
    if not params:
        raise ValueError(f"job {job_id} has no persisted params")

    decoded = decode_params(params)
    config_dict = decoded.get("config") or {}
    config = (
        intelligence_pb2.IngestionConfig(**config_dict) if config_dict else None
    )

    user_id = decoded["user_id"]
    resource_id = decoded["resource_id"]
    job_uuid = uuid.UUID(job_id)
    url = decoded.get("url")
    text_content = decoded.get("text")
    file_content = decoded.get("file_content")
    title = decoded.get("title")
    metadata = decoded.get("metadata") or {}
    resource_type = int(decoded.get("resource_type", 0))
    is_global = bool(decoded.get("is_global", False))

    try:
        async with get_session() as session:
            job_repo = JobRepository(session)
            await job_repo.update_job_status(job_uuid, status="processing")

        content = ""
        source_url = None
        document_type = resource_type

        if text_content:
            content = text_content
        elif url:
            follow_links = (
                config.follow_links
                if config and config.HasField("follow_links")
                else False
            )
            max_depth = (
                config.max_depth if config and config.HasField("max_depth") else 1
            )

            try:
                if follow_links:
                    from features.knowledge.pipeline.crawler import WebCrawler

                    max_pages = 50 if max_depth > 1 else 10
                    async with WebCrawler(
                        max_pages=max_pages, max_depth=max_depth, use_browser=True
                    ) as crawler:
                        pages = await crawler.crawl(url)
                        if pages:
                            content_parts = []
                            for page in pages:
                                page_title = page.get("title", "")
                                page_url = page.get("final_url", "")
                                page_c = page.get("content", "")
                                content_parts.append(
                                    f"# {page_title}\nSource: {page_url}\n\n{page_c}\n"
                                )
                            content = "\n\n".join(content_parts)
                            source_url = url
                            logger.info("Crawled %d pages from %s", len(pages), url)
                        else:
                            logger.warning("No content crawled from %s", url)
                            content = f"URL: {url}"
                else:
                    from features.knowledge.scrapers.browser import BrowserScraper

                    async with BrowserScraper() as scraper:
                        result = await scraper.scrape(url)
                        page_title = result.get("title", "")
                        page_content = result.get("content", "")
                        content = f"# {page_title}\nSource: {url}\n\n{page_content}\n"
                        source_url = url
                        logger.info("Scraped single page %s using BrowserScraper", url)
            except Exception as e:
                logger.error("Failed to process URL %s: %s", url, e)
                content = f"Failed to process: {url}\nError: {str(e)}"
                source_url = url
        elif file_content:
            content = file_content.decode("utf-8", errors="ignore")

        if not content:
            logger.warning("No content for resource %s, marking as failed", resource_id)
            async with get_session() as session:
                job_repo = JobRepository(session)
                await job_repo.update_job_status(
                    job_uuid, status="failed", errors=["No content extracted"]
                )
            return

        doc_proto = intelligence_pb2.Document(
            id=resource_id,
            title=title or (url if url else "Uploaded Document"),
            content=content,
            type=document_type,
            source_url=source_url or url or "",
            metadata=metadata,
        )

        async with get_session() as session:
            doc_repo = DocumentRepository(session)
            job_repo = JobRepository(session)
            processor = DocumentProcessor(doc_repo, job_repo, session)
            await processor.process_document(
                user_id=user_id,
                document=doc_proto,
                config=config,
                job_id=job_uuid,
                is_global=is_global,
            )

        async with get_session() as session:
            job_repo = JobRepository(session)
            await job_repo.complete_job(job_uuid)

        logger.info(
            "Background ingestion complete: job=%s, resource=%s", job_id, resource_id
        )

    except Exception as e:
        logger.error(
            "Background ingestion failed: job=%s, resource=%s: %s",
            job_id,
            resource_id,
            e,
            exc_info=True,
        )
        try:
            async with get_session() as session:
                job_repo = JobRepository(session)
                await job_repo.update_job_status(
                    job_uuid, status="failed", errors=[str(e)]
                )
        except Exception as inner:
            logger.error("Failed to update job status after failure: %s", inner)
        raise


async def sweep_stuck_jobs(bus) -> int:
    async with get_session() as session:
        stuck = await find_stuck_jobs(session)

    for job_id in stuck:
        await publish_job(bus, uuid.UUID(job_id), correlation_id=f"sweep-{job_id}")
        logger.warning("re-enqueued stuck ingestion job %s", job_id)
    return len(stuck)


__all__ = [
    "handle_ingestion_job",
    "execute_ingestion",
    "sweep_stuck_jobs",
    "get_dedupe",
]
