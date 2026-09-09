-- OpenTier Migration: Seed Free Credits
-- Backfills a signup bonus for any existing users who don't yet have a credit balance row.
-- On a fresh install with no users this is a no-op; safe to run unconditionally.
-- Depends on: 20260101000005_billing (user_credit_balances, credit_transactions)
--             20260101000001_identity (users)

INSERT INTO user_credit_balances (user_id, balance, held)
SELECT u.id, 10.0000, 0.0000
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_credit_balances b WHERE b.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Record the signup_bonus transaction in the immutable ledger.
INSERT INTO credit_transactions (
    user_id, delta, balance_after, reason, idempotency_key, metadata
)
SELECT
    u.id,
    10.0000,
    10.0000,
    'signup_bonus',
    'signup-backfill-' || u.id::text,
    '{"note": "Initial free signup credits grant"}'::jsonb
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM credit_transactions t
    WHERE t.user_id = u.id AND t.reason = 'signup_bonus'
)
ON CONFLICT (idempotency_key) DO NOTHING;
