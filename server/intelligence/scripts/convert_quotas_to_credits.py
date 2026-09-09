"""One-time quota → credits conversion.

Grants each active user credits for their remaining free messages:
    grant = max(0, message_limit - messages_used) * CREDIT_PER_MESSAGE
Idempotent per user via ledger `idempotency_key = 'quota-conv-<user_id>'`.

Run once before flipping CREDITS_ENFORCED=true.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text


async def main() -> int:
    price = float(os.environ.get("CREDIT_PER_MESSAGE", "10.0"))
    engine_mod = __import__(
        "shared.database.session", fromlist=["get_engine"]
    )
    engine = engine_mod.get_engine()

    async with engine.begin() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT id::text, GREATEST(message_limit - messages_used, 0) "
                    "AS remaining FROM users "
                    "WHERE deleted_at IS NULL AND is_disabled = FALSE"
                )
            )
        ).all()

        granted = skipped = 0
        for user_id, remaining in rows:
            amount = round(int(remaining) * price, 4)
            if amount <= 0:
                skipped += 1
                continue
            key = f"quota-conv-{user_id}"

            inserted = (
                await conn.execute(
                    text(
                        "INSERT INTO credit_transactions "
                        " (user_id, delta, balance_after, reason, "
                        "  idempotency_key) "
                        "VALUES (:u, :d, 0, 'grant', :k) "
                        "ON CONFLICT (idempotency_key) DO NOTHING RETURNING id"
                    ),
                    {"u": user_id, "d": amount, "k": key},
                )
            ).first()
            if inserted is None:
                skipped += 1
                continue

            await conn.execute(
                text(
                    "INSERT INTO user_credit_balances (user_id, balance) "
                    "VALUES (:u, :b) "
                    "ON CONFLICT (user_id) DO UPDATE "
                    "SET balance = user_credit_balances.balance + :b, "
                    "    version = user_credit_balances.version + 1"
                ),
                {"u": user_id, "b": amount},
            )
            await conn.execute(
                text(
                    "UPDATE credit_transactions SET balance_after = ("
                    " SELECT balance FROM user_credit_balances "
                    " WHERE user_id = :u) WHERE idempotency_key = :k"
                ),
                {"u": user_id, "k": key},
            )
            granted += 1

    print(f"conversion done: granted={granted} skipped={skipped} "
          f"(price/message={price})")
    await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
