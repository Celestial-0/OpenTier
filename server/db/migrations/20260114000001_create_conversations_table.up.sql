-- Create conversations table (shared with intelligence layer)
-- Uses CREATE IF NOT EXISTS to allow both layers to run migrations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    metadata JSON NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Create index if not exists
CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id);