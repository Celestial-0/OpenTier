-- Down: Identity & Authentication
-- Drops all identity/auth tables, enums, shared function, and extension.
-- Must run AFTER domain migrations that depend on these have been rolled back.

DROP TABLE IF EXISTS oauth_login_codes CASCADE;
DROP TABLE IF EXISTS oauth_auth_states CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS ip_usage CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP TYPE IF EXISTS model_kind CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP EXTENSION IF EXISTS pgcrypto;
