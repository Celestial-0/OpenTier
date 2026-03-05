-- Drop users table and related objects
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role;
DROP FUNCTION IF EXISTS update_updated_at_column();