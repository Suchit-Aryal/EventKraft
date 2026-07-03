-- 009: pgvector embeddings for semantic recommendations
-- Gemini gemini-embedding-001 with outputDimensionality=768.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE service_gigs  ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE job_postings  ADD COLUMN IF NOT EXISTS embedding vector(768);
