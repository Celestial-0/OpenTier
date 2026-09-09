"""Durable ingestion queue."""

from __future__ import annotations

import base64
import json
import uuid
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.events import EventEnvelope, EventTypes, Streams


def build_params(
    user_id: str,
    resource_id: str,
    url: str | None,
    text_content: str | None,
    file_content: bytes | None,
    title: str | None,
    metadata: dict[str, str],
    config_dict: dict[str, Any] | None,
    resource_type: int,
    is_global: bool,
) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "resource_id": resource_id,
        "url": url,
        "text": text_content,
        "file_content_b64": (
            base64.b64encode(file_content).decode() if file_content else None
        ),
        "title": title,
        "metadata": {str(k): str(v) for k, v in (metadata or {}).items()},
        "config": config_dict or {},
        "resource_type": int(resource_type),
        "is_global": bool(is_global),
    }


async def persist_params(
    session: AsyncSession, job_id: uuid.UUID, params: dict[str, Any]
) -> None:
    await session.execute(
        text("UPDATE ingestion_jobs SET params = CAST(:p AS jsonb) WHERE id = :id"),
        {"p": json.dumps(params), "id": str(job_id)},
    )


async def publish_job(bus, job_id: uuid.UUID, correlation_id: str | None = None) -> str:
    envelope = EventEnvelope.create(
        EventTypes.INGESTION_JOB_ENQUEUED,
        correlation_id or f"ingestion-{job_id}",
        {"job_id": str(job_id)},
    )
    return await bus.publish(Streams.INGESTION_JOBS, envelope)


async def load_params(session: AsyncSession, job_id: str) -> dict[str, Any] | None:
    row = (
        await session.execute(
            text("SELECT params FROM ingestion_jobs WHERE id = :id"),
            {"id": job_id},
        )
    ).scalar_one_or_none()
    return dict(row) if row else None


async def find_stuck_jobs(
    session: AsyncSession, older_than_minutes: int = 10
) -> list[str]:
    rows = (
        await session.execute(
            text(
                "SELECT id::text FROM ingestion_jobs "
                "WHERE params != '{}'::jsonb "
                "AND ( "
                "  status = 'queued' "
                "  OR (status = 'processing' AND "
                "      started_at < NOW() - (:mins * INTERVAL '1 minute')) "
                ") ORDER BY id"
            ),
            {"mins": older_than_minutes},
        )
    ).scalars().all()
    return [str(r) for r in rows]


def decode_params(params: dict[str, Any]) -> dict[str, Any]:
    out = dict(params)
    if out.get("file_content_b64"):
        out["file_content"] = base64.b64decode(out.pop("file_content_b64"))
    return out


__all__ = [
    "build_params",
    "persist_params",
    "publish_job",
    "load_params",
    "find_stuck_jobs",
    "decode_params",
]
