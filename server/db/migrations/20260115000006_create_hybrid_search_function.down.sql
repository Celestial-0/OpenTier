-- Drop hybrid search function
DROP FUNCTION IF EXISTS hybrid_search(vector(384), text, text, integer, float, float);