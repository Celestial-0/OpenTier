-- OpenTier Migration: Model Catalog DDL
-- Domain: AI model providers and model definitions
-- Depends on: 20260101000001_identity (model_kind ENUM, update_updated_at_column)
-- Note: 20260101000002_seed_model_catalog runs AFTER this to populate rows.

-- ── 15. Model Providers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    base_url TEXT NOT NULL,
    encrypted_api_key BYTEA,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_providers_enabled ON model_providers(enabled);

DROP TRIGGER IF EXISTS update_model_providers_updated_at ON model_providers;
CREATE TRIGGER update_model_providers_updated_at
    BEFORE UPDATE ON model_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 16. Models ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES model_providers(id) ON DELETE RESTRICT,
    slug VARCHAR(200) NOT NULL UNIQUE,
    display_name VARCHAR(200) NOT NULL,
    kind model_kind NOT NULL,
    context_window INTEGER NOT NULL DEFAULT 8192,
    max_output_tokens INTEGER,
    dimensions INTEGER,
    -- Pricing: cost in OpenTier credits per 1,000,000 native provider tokens (1 credit = $0.001 USD)
    input_cost_per_mtok NUMERIC(12,6) NOT NULL DEFAULT 0 CHECK (input_cost_per_mtok >= 0),
    output_cost_per_mtok NUMERIC(12,6) NOT NULL DEFAULT 0 CHECK (output_cost_per_mtok >= 0),
    capabilities JSONB NOT NULL DEFAULT '{}',
    fallback_model_id UUID REFERENCES models(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_models_dimensions_by_kind CHECK (
        (kind = 'embedding' AND dimensions IS NOT NULL) OR
        (kind <> 'embedding')
    )
);

CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_kind_enabled ON models(kind, enabled);
CREATE INDEX IF NOT EXISTS idx_models_priority ON models(priority);
CREATE UNIQUE INDEX IF NOT EXISTS uq_models_default_per_kind ON models(kind) WHERE is_default;

DROP TRIGGER IF EXISTS update_models_updated_at ON models;
CREATE TRIGGER update_models_updated_at
    BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
