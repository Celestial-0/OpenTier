-- OpenTier Migration: Knowledge Ingestion
-- Domain: Documents, chunks, ingestion jobs, knowledge submissions
-- Depends on: 20260101000001_identity (users table, update_updated_at_column)

-- ── 11. Documents ────────────────────────────────────────────────────────────
-- user_id is VARCHAR(255): documents may be owned by intelligence-service user IDs
-- that don't necessarily map to a users row (e.g. system-ingested global docs).
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    source_url VARCHAR(1000),
    metadata JSONB NOT NULL DEFAULT '{}',
    is_global BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_global ON documents(is_global);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 12. Document Chunks ──────────────────────────────────────────────────────
-- Text and metadata source of truth; vectors live in Qdrant.
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks(created_at DESC);

-- ── 13. Ingestion Jobs ───────────────────────────────────────────────────────
-- Tracks async Redis Streams ingestion pipeline state per user.
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    total_documents INTEGER NOT NULL DEFAULT 0,
    processed_documents INTEGER NOT NULL DEFAULT 0,
    failed_documents INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]',
    progress_percent FLOAT NOT NULL DEFAULT 0.0,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_id ON ingestion_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status_started ON ingestion_jobs(status, started_at);

-- ── 14. Knowledge Submissions ────────────────────────────────────────────────
-- Contributor-submitted content pending admin review before ingestion.
CREATE TABLE IF NOT EXISTS knowledge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    resource_type VARCHAR(50) NOT NULL DEFAULT 'text',
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_feedback TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_status ON knowledge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_contributor ON knowledge_submissions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_created_at ON knowledge_submissions(created_at DESC);

DROP TRIGGER IF EXISTS update_knowledge_submissions_updated_at ON knowledge_submissions;
CREATE TRIGGER update_knowledge_submissions_updated_at
    BEFORE UPDATE ON knowledge_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
