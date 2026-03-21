-- OAuth state + PKCE storage for CSRF-safe authorize/callback flow
CREATE TABLE IF NOT EXISTS oauth_auth_states (
    state VARCHAR(128) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    pkce_verifier VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_auth_states_expires_at
ON oauth_auth_states(expires_at);

-- One-time handoff code to avoid exposing session tokens in callback query params
CREATE TABLE IF NOT EXISTS oauth_login_codes (
    code VARCHAR(128) PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_new_user BOOLEAN NOT NULL DEFAULT FALSE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_login_codes_expires_at
ON oauth_login_codes(expires_at);
