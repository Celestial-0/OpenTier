-- Create role enum type (must be created before users table)
-- Using DO block to handle re-runs gracefully
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'contributor', 'admin');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Create users table with all columns
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    username VARCHAR(100) UNIQUE,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'user',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Usage limits
    message_limit INTEGER NOT NULL DEFAULT 10,
    is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
    messages_used INTEGER NOT NULL DEFAULT 0
);
-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)
WHERE deleted_at IS NULL;
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Create index for is_disabled to quickly filter blocked users
CREATE INDEX IF NOT EXISTS idx_users_is_disabled ON users(is_disabled);
-- IP-based anonymous usage tracking table
-- Tracks message counts for unauthenticated users by IP address
CREATE TABLE IF NOT EXISTS ip_usage (
    ip_address VARCHAR(64) PRIMARY KEY,
    messages_used INTEGER NOT NULL DEFAULT 0,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index for cleanup jobs (old IPs)
CREATE INDEX IF NOT EXISTS idx_ip_usage_last_seen ON ip_usage(last_seen);