-- Create user_memories table
CREATE TABLE IF NOT EXISTS user_memories (
    user_id VARCHAR(255) PRIMARY KEY,
    memory TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add comment
COMMENT ON TABLE user_memories IS 'Stores long-term memory/context for users across conversations';