-- Down: Model Catalog DDL
-- Note: model_kind ENUM is defined in the identity migration and dropped there.
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS model_providers CASCADE;
