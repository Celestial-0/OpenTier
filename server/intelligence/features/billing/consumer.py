"""Billing event consumer: prices turns and burns credits."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from core.events import EventEnvelope
from features.billing.ledger import burn_credits
from shared.database.session import get_engine

logger = logging.getLogger(__name__)


async def handle_chat_completed(envelope: EventEnvelope, msg_id: str) -> None:
    """Metering consumer: price the turn, burn once (idempotent), reconcile."""
    p: dict[str, Any] = envelope.payload
    user_id = str(p["user_id"])
    if user_id.startswith("ip:"):
        logger.debug("anonymous user turn %s; skipping credit billing", user_id)
        return

    message_id = str(p["message_id"])
    model_slug = str(p.get("model_slug", ""))
    tokens_in = int(p.get("tokens_in", 0))
    tokens_out = int(p.get("tokens_out", 0))
    conversation_id = str(p.get("conversation_id", ""))
    hold_key = p.get("hold_key")

    maker = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    async with maker() as session:
        rates = (
            await session.execute(
                text(
                    "SELECT m.id::text, m.input_cost_per_mtok, "
                    "       m.output_cost_per_mtok, m.slug "
                    "FROM models m WHERE m.slug = :slug"
                ),
                {"slug": model_slug},
            )
        ).first()
        if rates is None:
            # Fallback to default chat model if model slug was unmapped
            rates = (
                await session.execute(
                    text(
                        "SELECT m.id::text, m.input_cost_per_mtok, "
                        "       m.output_cost_per_mtok, m.slug "
                        "FROM models m WHERE m.is_default = true AND m.kind = 'chat'"
                    )
                )
            ).first()
            if rates is not None:
                model_slug = str(rates[3])

        if rates is None:
            logger.warning("unknown model %r and no default chat model; skipping burn", model_slug)
            return

        model_id, in_rate, out_rate = rates[0], rates[1], rates[2]

        cost_in = (Decimal(str(in_rate)) * Decimal(tokens_in)) / Decimal(1_000_000)
        cost_out = (Decimal(str(out_rate)) * Decimal(tokens_out)) / Decimal(1_000_000)
        cost = cost_in + cost_out

        if cost == 0 and not hold_key:
            return  # zero-priced with no hold to reconcile

        balance_after = await burn_credits(
            session,
            user_id=user_id,
            message_id=message_id,
            model_id=str(model_id),
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost=cost,
            cost_input=cost_in,
            cost_output=cost_out,
            correlation_id=envelope.correlation_id,
            conversation_id=conversation_id or None,
            hold_key=hold_key,
        )

        if balance_after is not None:
            logger.info(
                "billed %.4f credits for %d prompt / %d completion raw tokens on model %s (msg=%s, new_balance=%.4f credits)",
                float(cost),
                tokens_in,
                tokens_out,
                model_slug,
                message_id,
                balance_after,
            )


__all__ = ["handle_chat_completed"]
