"""Phase-4 metering E2E: publish chat.completed -> worker burns credits once.

Creates an ephemeral user + granted balance on the live DB, runs the real
metering handler twice over the same event (at-least-once delivery), asserts
exactly one burn and correct balance, then cleans up.
"""

import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from sqlalchemy import text

from shared.database.session import get_engine


async def main() -> int:
    from features.billing.consumer import handle_chat_completed
    from features.billing.calculator import compute_cost
    from core.events import EventEnvelope, EventTypes

    # math sanity: raw provider tokens priced at credit rates
    assert compute_cost(150.0, 600.0, 10_000, 5_000) == __import__(
        "decimal"
    ).Decimal("4.5")

    engine = get_engine()
    user_id = str(uuid.uuid4())
    message_id = f"msg-{uuid.uuid4().hex[:12]}"
    grant = 100.0

    async with engine.begin() as conn:
        await conn.execute(
            text("INSERT INTO users (id, email) VALUES (:id, :email)"),
            {"id": user_id, "email": f"meter-{uuid.uuid4().hex[:8]}@smoke.local"},
        )
        await conn.execute(
            text(
                "INSERT INTO user_credit_balances (user_id, balance, held) "
                "VALUES (:u, :b, :h)"
            ),
            {"u": user_id, "b": grant, "h": 10.0},
        )
        await conn.execute(
            text(
                "INSERT INTO models (provider_id, slug, display_name, kind, "
                " input_cost_per_mtok, output_cost_per_mtok, dimensions) "
                "SELECT p.id, 'meter-smoke-model', 'Meter Smoke', 'chat', "
                "       150.0, 600.0, NULL FROM model_providers p "
                "WHERE p.slug='openai'"
            ),
        )
        model_slug = "meter-smoke-model"

    envelope = EventEnvelope.create(
        EventTypes.CHAT_COMPLETED,
        "e2e-metering",
        {
            "user_id": user_id,
            "conversation_id": "",
            "message_id": message_id,
            "tokens_in": 10_000,
            "tokens_out": 5_000,
            "model_slug": model_slug,
            "sources_count": 0,
        },
    )

    # at-least-once: deliver the SAME event twice
    await handle_chat_completed(envelope, "m-1")
    await handle_chat_completed(envelope, "m-2")  # duplicate

    async with engine.connect() as conn:
        row = (
            await conn.execute(
                text(
                    "SELECT balance, held FROM user_credit_balances "
                    "WHERE user_id=:u"
                ),
                {"u": user_id},
            )
        ).first()
        balance, held = float(row[0]), float(row[1])
        burns = (
            await conn.execute(
                text(
                    "SELECT COUNT(*), COALESCE(SUM(delta),0) "
                    "FROM credit_transactions WHERE idempotency_key=:k"
                ),
                {"k": message_id},
            )
        ).first()

    print(f"balance={balance} held={held} ledger_rows={burns[0]} sum_delta={burns[1]}")
    # hold of 10.00 covers the 4.50 burn: released back then charged
    assert abs(balance - 100.0) < 1e-6 and abs(held - 5.5) < 1e-6
    assert burns[0] == 1 and float(burns[1]) == -4.5

    async with engine.begin() as conn:
        for stmt, params in [
            ("DELETE FROM credit_transactions WHERE user_id=:u", {"u": user_id}),
            ("DELETE FROM user_credit_balances WHERE user_id=:u", {"u": user_id}),
            ("DELETE FROM users WHERE id=:u", {"u": user_id}),
            ("DELETE FROM models WHERE slug=:s", {"s": model_slug}),
        ]:
            await conn.execute(text(stmt), params)

    print("PHASE4_METERING_OK single-burn + duplicate-dedupe verified")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
