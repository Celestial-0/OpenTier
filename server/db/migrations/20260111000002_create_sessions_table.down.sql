-- Drop sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TABLE IF EXISTS sessions CASCADE;