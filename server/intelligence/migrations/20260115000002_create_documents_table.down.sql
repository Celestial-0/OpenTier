-- Drop documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TABLE IF EXISTS documents CASCADE;