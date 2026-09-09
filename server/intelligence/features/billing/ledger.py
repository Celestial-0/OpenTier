"""Ledger interactions: credit transactions and atomic burns."""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def burn_credits(
    session: AsyncSession,
    *,
    user_id: str,
    message_id: str,
    model_id: str,
    tokens_in: int,
    tokens_out: int,
    cost: Decimal,
    cost_input: Optional[Decimal] = None,
    cost_output: Optional[Decimal] = None,
    correlation_id: str,
    conversation_id: Optional[str] = None,
    hold_key: Optional[str] = None,
) -> Optional[float]:
    """Burns credits atomically with idempotency and hold reconciliation.

    Returns the new balance, or None if skipped (duplicate/no-balance).
    """
    if cost <= 0 and not hold_key:
        return None

    # Anonymous or IP-based users do not have a registered credit ledger row
    try:
        user_uuid = str(uuid.UUID(str(user_id)))
    except (ValueError, TypeError, AttributeError):
        logger.debug("skipping credit burn for non-UUID user: %s", user_id)
        return None

    conv_uuid: Optional[str] = None
    if conversation_id:
        try:
            conv_uuid = str(uuid.UUID(str(conversation_id)))
        except (ValueError, TypeError, AttributeError):
            conv_uuid = None

    cost_in = cost_input if cost_input is not None else cost
    cost_out = cost_output if cost_output is not None else Decimal("0.0")

    # 1) Idempotency gate: duplicate delivery burns nothing.
    inserted = (
        await session.execute(
            text(
                "INSERT INTO credit_transactions "
                " (user_id, delta, balance_after, reason, model_id, "
                "  tokens_in, tokens_out, cost_input, cost_output, "
                "  conversation_id, idempotency_key, correlation_id) "
                "VALUES (:u, :delta, 0, 'usage', :m, :ti, :to, :ci, :co, "
                "        :conv, :key, :corr) "
                "ON CONFLICT (idempotency_key) DO NOTHING RETURNING id"
            ),
            {
                "u": user_uuid,
                "delta": -float(cost),
                "m": model_id,
                "ti": tokens_in,
                "to": tokens_out,
                "ci": float(cost_in),
                "co": float(cost_out),
                "conv": conv_uuid,
                "key": message_id,
                "corr": correlation_id,
            },
        )
    ).first()
    if inserted is None:
        logger.debug("duplicate usage event %s; ignoring", message_id)
        return None

    # 2) Consume any active hold for this turn and reclaim held amount
    held_amount = 0.0
    lookup_key = hold_key or message_id
    hold_row = (
        await session.execute(
            text(
                "UPDATE credit_holds "
                "SET status = 'consumed' "
                "WHERE (idempotency_key = :key OR idempotency_key = :msg_id) "
                "  AND user_id = :u AND status = 'open' "
                "RETURNING amount::float8"
            ),
            {"key": lookup_key, "msg_id": message_id, "u": user_uuid},
        )
    ).first()
    if hold_row is not None and hold_row[0] is not None:
        held_amount = float(hold_row[0])

    # 3) Atomic balance deduction and held pool reduction
    # Reconcile held funds:
    # balance was reduced by held_amount at reserve time.
    # New balance = balance + held_amount - actual_cost
    # held = GREATEST(0, held - held_amount)
    updated = (
        await session.execute(
            text(
                "UPDATE user_credit_balances "
                "SET balance = balance + :h - :c, "
                "    held = GREATEST(0.0, held - :h), "
                "    version = version + 1 "
                "WHERE user_id = :u RETURNING balance::float8"
            ),
            {"c": float(cost), "h": held_amount, "u": user_uuid},
        )
    ).first()
    if updated is None:
        await session.rollback()
        logger.warning(
            "no credit balance for user %s; usage %s un-billed",
            user_id,
            message_id,
        )
        return None

    balance_after = float(updated[0])
    await session.execute(
        text(
            "UPDATE credit_transactions SET balance_after = :b "
            "WHERE idempotency_key = :key"
        ),
        {"b": balance_after, "key": message_id},
    )
    await session.commit()
    return balance_after


__all__ = ["burn_credits"]
