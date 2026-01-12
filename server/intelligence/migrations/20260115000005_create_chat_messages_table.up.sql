-- Create chat_messages table for intelligence service
-- Note: API has 'messages' table, intelligence uses 'chat_messages' for its specific needs
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    -- user, assistant, system
    content TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]',
    -- RAG sources used
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
-- Add comment
COMMENT ON TABLE chat_messages IS 'Stores chat messages with RAG sources for intelligence service';