-- Create ingestion_jobs table for tracking batch processing
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    total_documents INTEGER NOT NULL DEFAULT 0,
    processed_documents INTEGER NOT NULL DEFAULT 0,
    failed_documents INTEGER NOT NULL DEFAULT 0,
    errors JSONB NOT NULL DEFAULT '[]',
    progress_percent FLOAT NOT NULL DEFAULT 0.0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_user_id ON ingestion_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
-- Add comment
COMMENT ON TABLE ingestion_jobs IS 'Tracks batch document processing jobs';