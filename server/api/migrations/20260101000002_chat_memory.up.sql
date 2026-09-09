-- OpenTier Migration: Chat & Memory
-- Domain: Conversations, chat messages, per-user memory
-- Depends on: 20260101000001_identity (users table)

-- ── 8. Conversations ─────────────────────────────────────────────────────────
-- Note: user_id is VARCHAR(255) (not a FK) to allow anonymous/external user IDs
-- from the intelligence service without requiring a users row.
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations(user_id);

-- ── 9. Chat Messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    parent_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ── 10. User Memories ────────────────────────────────────────────────────────
-- Keyed by VARCHAR user_id to match the intelligence service's identity model.
CREATE TABLE IF NOT EXISTS user_memories (
    user_id VARCHAR(255) PRIMARY KEY,
    memory TEXT NOT NULL DEFAULT '',
    metadata JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
