DELETE FROM models WHERE slug IN (
    'gemini-3.5-flash-lite',
    'gemini-embedding-2',
    'sentence-transformers/all-MiniLM-L6-v2',
);

DELETE FROM model_providers WHERE slug IN ('openai', 'google', 'anthropic', 'ollama', 'local');
