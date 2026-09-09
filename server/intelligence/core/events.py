"""Canonical event envelope for the Redis Streams backbone.

Mirrors ``server/api/src/common/events.rs`` — keep both in lockstep:
``{event_id, event_type, occurred_at, correlation_id, payload}``.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class Streams:
    """Well-known stream names (``opentier:{domain}:{name}``)."""

    CHAT_EVENTS = "opentier:events:chat"
    INGESTION_JOBS = "opentier:jobs:ingestion"
    LIFECYCLE_EVENTS = "opentier:events:lifecycle"
    HEARTBEAT = "opentier:ops:heartbeat"

    @staticmethod
    def dlq(stream: str) -> str:
        return f"{stream}:dlq"


class EventTypes:
    """Versioned event types (``domain.event.vN``)."""

    CHAT_COMPLETED = "chat.completed.v1"
    USER_DELETED = "user.deleted.v1"
    RESOURCE_DELETED = "resource.deleted.v1"
    INGESTION_JOB_ENQUEUED = "ingestion.job.enqueued.v1"


class EventEnvelope(BaseModel):
    """Envelope serialized as the ``envelope`` JSON field of a stream entry."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    occurred_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    correlation_id: str
    payload: dict[str, Any] = Field(default_factory=dict)

    def to_stream_fields(self) -> dict[str, str]:
        """Flat string fields for XADD (Redis Streams carry no nested types)."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat(),
            "correlation_id": self.correlation_id,
            "envelope": self.model_dump_json(),
        }

    @classmethod
    def create(
        cls,
        event_type: str,
        correlation_id: str,
        payload: dict[str, Any] | None = None,
    ) -> "EventEnvelope":
        return cls(
            event_type=event_type,
            correlation_id=correlation_id,
            payload=payload or {},
        )

    @classmethod
    def from_stream_fields(cls, fields: dict[Any, Any]) -> "EventEnvelope":
        """Reconstruct envelope from flat stream fields (supports bytes and str keys/values)."""
        raw_env = fields.get("envelope") or fields.get(b"envelope")
        if raw_env is not None:
            if isinstance(raw_env, bytes):
                raw_env = raw_env.decode("utf-8")
            return cls.model_validate_json(raw_env)

        data: dict[str, Any] = {}
        for k, v in fields.items():
            key = k.decode("utf-8") if isinstance(k, bytes) else str(k)
            val = v.decode("utf-8") if isinstance(v, bytes) else v
            data[key] = val
        return cls.model_validate(data)

