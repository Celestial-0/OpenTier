-- OpenTier Migration: Billing & Events
-- Domain: Credit ledger, holds, and transactional outbox
-- Depends on: 20260101000001_identity (users, update_updated_at_column)
--             20260101000001d_model_catalog (models — credit_transactions.model_id FK)

-- ── 17. User Credit Balances ─────────────────────────────────────────────────
-- One row per user; balance and held amounts are updated atomically with OCC (version).
CREATE TABLE IF NOT EXISTS user_credit_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    held NUMERIC(14,4) NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_user_credit_balances_updated_at ON user_credit_balances;
CREATE TRIGGER update_user_credit_balances_updated_at
    BEFORE UPDATE ON user_credit_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 18. Credit Transactions (Append-Only Ledger) ─────────────────────────────
-- Immutable ledger row per transaction. idempotency_key enforces exactly-once writes.
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta NUMERIC(14,4) NOT NULL,
    balance_after NUMERIC(14,4) NOT NULL,
    reason VARCHAR(30) NOT NULL CHECK (reason IN (
        'grant', 'usage', 'refund', 'admin_adjustment', 'signup_bonus'
    )),
    model_id UUID REFERENCES models(id) ON DELETE SET NULL,
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    cost_input NUMERIC(14,6) NOT NULL DEFAULT 0,
    cost_output NUMERIC(14,6) NOT NULL DEFAULT 0,
    conversation_id UUID,
    idempotency_key TEXT NOT NULL UNIQUE,
    correlation_id VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reason ON credit_transactions(reason);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_model ON credit_transactions(model_id);

-- ── 19. Credit Holds ─────────────────────────────────────────────────────────
-- Pre-authorisation holds that reserve balance during streaming inference.
CREATE TABLE IF NOT EXISTS credit_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(14,4) NOT NULL CHECK (amount >= 0),
    idempotency_key TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'released', 'consumed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_holds_user_status ON credit_holds(user_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_holds_created ON credit_holds(created_at) WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_holds_user_key ON credit_holds(user_id, idempotency_key);

-- ── 20. Event Outbox (Transactional Outbox Pattern) ──────────────────────────
-- Stores events to be reliably published to Redis Streams within the same DB transaction.
CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream TEXT NOT NULL,
    event_type TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_outbox_pending ON event_outbox(created_at) WHERE published_at IS NULL;
