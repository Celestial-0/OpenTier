"""Billing event publisher."""

from __future__ import annotations

import logging
import os
from typing import Optional

from core.events import EventEnvelope, EventTypes, Streams
from shared.redis.client import build_redis
from shared.redis.bus import EventBus

logger = logging.getLogger(__name__)

_bus: Optional[EventBus] = None


async def get_billing_bus() -> EventBus:
    global _bus
    if _bus is None:
        redis_client = await build_redis(
            os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        )
        _bus = EventBus(redis_client)
    return _bus


async def publish_chat_completed(
    *,
    user_id: str,
    conversation_id: str,
    message_id: str,
    prompt_tokens: int,
    completion_tokens: int,
    model_slug: str,
    sources_count: int,
    correlation_id: Optional[str] = None,
    hold_key: Optional[str] = None,
) -> None:
    """Fires after assistant message persistence — non-blocking to user chat."""
    try:
        bus = await get_billing_bus()
        await bus.publish(
            Streams.CHAT_EVENTS,
            EventEnvelope.create(
                EventTypes.CHAT_COMPLETED,
                correlation_id or f"chat-{message_id}",
                {
                    "user_id": user_id,
                    "conversation_id": conversation_id,
                    "message_id": message_id,
                    "tokens_in": int(prompt_tokens),
                    "tokens_out": int(completion_tokens),
                    "model_slug": model_slug,
                    "sources_count": int(sources_count),
                    "hold_key": hold_key,
                },
            ),
        )
    except Exception:  # noqa: BLE001 — billing events must never break chat
        logger.exception("failed to publish chat.completed")


__all__ = ["publish_chat_completed", "get_billing_bus"]
