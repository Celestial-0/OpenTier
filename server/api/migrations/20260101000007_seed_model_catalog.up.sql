-- Seed default model catalog:
-- Provider: Google AI enabled by default.
-- Chat: Gemini 3.5 Flash Lite (gemini-3.5-flash-lite) default chat model.
-- Embedding: Gemini Embedding 2 (gemini-embedding-2, 3072d) system default embedding model.

INSERT INTO model_providers (slug, display_name, base_url, enabled) VALUES
    ('google',    'Google AI',          'https://generativelanguage.googleapis.com/v1beta/openai/', TRUE),
    ('openai',    'OpenAI',             'https://api.openai.com/v1', FALSE),
    ('anthropic', 'Anthropic',          'https://api.anthropic.com/v1', FALSE),
    ('ollama',    'Ollama (self-host)', 'http://host.docker.internal:11434/v1', FALSE),
    ('local',     'Local Inference',    'local://sentence-transformers', FALSE)
ON CONFLICT (slug) DO NOTHING;

-- Default Chat Model: Gemini 3.5 Flash Lite
-- Google measures usage purely in native tokens ($0.10 / 1M prompt tokens, $0.40 / 1M output tokens).
-- In OpenTier platform credits (1 credit = $0.001 USD):
--   input_cost_per_mtok  = 100.0 credits per 1M native prompt tokens
--   output_cost_per_mtok = 400.0 credits per 1M native completion tokens
INSERT INTO models (
    provider_id, slug, display_name, kind, context_window,
    max_output_tokens, input_cost_per_mtok, output_cost_per_mtok,
    capabilities, priority, enabled, is_default
)
SELECT
    p.id, 'gemini-3.5-flash-lite', 'Gemini 3.5 Flash Lite', 'chat'::model_kind,
    1048576, 65536, 100.000000, 400.000000,
    '{"streaming": true, "thinking": true, "temperature": 1.0, "top_p": 0.95, "top_k": 64}'::jsonb, 10, TRUE, TRUE
FROM model_providers p WHERE p.slug = 'google'
ON CONFLICT (slug) DO NOTHING;

-- System Default Embedding Model: Gemini Embedding 2 (gemini-embedding-2, 3072d)
INSERT INTO models (
    provider_id, slug, display_name, kind, context_window,
    dimensions, input_cost_per_mtok,
    capabilities, priority, enabled, is_default
)
SELECT
    p.id, 'gemini-embedding-2', 'Gemini Embedding 2', 'embedding'::model_kind,
    8192, 3072, 0.000000,
    '{"batch": true, "multimodal": true, "dimensions": [768, 1536, 3072]}'::jsonb, 10, TRUE, TRUE
FROM model_providers p WHERE p.slug = 'google'
ON CONFLICT (slug) DO NOTHING;

