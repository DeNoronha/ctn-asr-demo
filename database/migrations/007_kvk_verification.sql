-- KvK Document Verification Schema
-- Created: 2025-10-12

-- Add columns to legal_entity table
ALTER TABLE legal_entity
ADD COLUMN IF NOT EXISTS kvk_document_url TEXT,
ADD COLUMN IF NOT EXISTS kvk_verification_status VARCHAR(20) DEFAULT 'pending' CHECK (kvk_verification_status IN ('pending', 'verified', 'failed', 'flagged')),
ADD COLUMN IF NOT EXISTS kvk_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kvk_verified_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS kvk_verification_notes TEXT,
ADD COLUMN IF NOT EXISTS kvk_extracted_company_name TEXT,
ADD COLUMN IF NOT EXISTS kvk_extracted_number TEXT,
ADD COLUMN IF NOT EXISTS kvk_api_response JSONB,
ADD COLUMN IF NOT EXISTS kvk_mismatch_flags TEXT[],
ADD COLUMN IF NOT EXISTS document_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create index for verification status queries
CREATE INDEX IF NOT EXISTS idx_legal_entity_kvk_verification 
ON legal_entity(kvk_verification_status, kvk_verified_at);

-- Audit log for KvK verification
INSERT INTO audit_logs (event_type, actor_org_id, resource_type, resource_id, action, result, metadata)
VALUES (
  'SCHEMA_MIGRATION',
  'SYSTEM',
  'DATABASE',
  NULL,
  'ALTER_TABLE',
  'SUCCESS',
  '{"migration": "007_kvk_verification", "description": "Added KvK document verification fields to legal_entity table"}'::jsonb
);

-- Add comments
COMMENT ON COLUMN legal_entity.kvk_document_url IS 'Azure Blob Storage URL for uploaded KvK statement PDF';
COMMENT ON COLUMN legal_entity.kvk_verification_status IS 'Verification status: pending, verified, failed, flagged';
COMMENT ON COLUMN legal_entity.kvk_mismatch_flags IS 'Array of detected issues: company_name_mismatch, kvk_number_mismatch, bankrupt, dissolved';
COMMENT ON COLUMN legal_entity.kvk_extracted_company_name IS 'Company name extracted from PDF via Azure Document Intelligence';
COMMENT ON COLUMN legal_entity.kvk_extracted_number IS 'KvK number extracted from PDF via Azure Document Intelligence';
COMMENT ON COLUMN legal_entity.kvk_api_response IS 'Full response from KvK API basisprofiel endpoint';
