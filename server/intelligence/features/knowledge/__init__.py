"""Knowledge feature slice (resources, documents, ingestion, scrapers)."""

from features.knowledge.repository import DocumentRepository, JobRepository
from features.knowledge.service import KnowledgeService
from features.knowledge.grpc_servicer import ResourceService
from features.knowledge.worker import (
    handle_ingestion_job,
    execute_ingestion,
    sweep_stuck_jobs,
)

__all__ = [
    "DocumentRepository",
    "JobRepository",
    "KnowledgeService",
    "ResourceService",
    "handle_ingestion_job",
    "execute_ingestion",
    "sweep_stuck_jobs",
]
