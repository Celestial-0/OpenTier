-- Create knowledge_submissions table for contributor resource queue
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_status ON knowledge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_contributor ON knowledge_submissions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_submissions_created_at ON knowledge_submissions(created_at DESC);

-- Add updated_at trigger (reusing existing function)
DROP TRIGGER IF EXISTS update_knowledge_submissions_updated_at ON knowledge_submissions;
CREATE TRIGGER update_knowledge_submissions_updated_at BEFORE
UPDATE ON knowledge_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE knowledge_submissions IS 'Stores contributor knowledge resource submissions pending admin review';
