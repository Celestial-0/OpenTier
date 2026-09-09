-- Down: Seed Free Credits
-- Removes the backfill signup bonus transactions seeded by this migration.
DELETE FROM credit_transactions WHERE idempotency_key LIKE 'signup-backfill-%';
