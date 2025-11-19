-- ================================================================================================
-- Identifier Verification History
-- ================================================================================================
-- Generic identifier verification tracking for LEI, EORI, DUNS, and other identifiers
-- Similar to KvK verification but extensible to any identifier type

CREATE TABLE IF NOT EXISTS identifier_verification_history (
  verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,
  identifier_id UUID NOT NULL REFERENCES legal_entity_identifiers(identifier_id) ON DELETE CASCADE,

  -- Identifier details (denormalized for historical tracking)
  identifier_type VARCHAR(50) NOT NULL, -- 'LEI', 'EORI', 'DUNS', 'KVK', etc.
  identifier_value VARCHAR(255) NOT NULL,

  -- Verification details
  verification_method VARCHAR(50) NOT NULL, -- 'document_upload', 'api_validation', 'manual_review'
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'flagged'

  -- Document storage (if uploaded)
  document_blob_url TEXT,
  document_filename VARCHAR(255),
  document_mime_type VARCHAR(100),

  -- Extracted data (from Document Intelligence or API)
  extracted_data JSONB,

  -- Review information
  verified_by UUID, -- Azure AD user ID of reviewer
  verified_at TIMESTAMP,
  verification_notes TEXT,

  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_verification_status CHECK (verification_status IN ('pending', 'verified', 'failed', 'flagged')),
  CONSTRAINT valid_verification_method CHECK (verification_method IN ('document_upload', 'api_validation', 'manual_review'))
);

-- Indexes for common queries
CREATE INDEX idx_identifier_verification_legal_entity ON identifier_verification_history(legal_entity_id);
CREATE INDEX idx_identifier_verification_identifier ON identifier_verification_history(identifier_id);
CREATE INDEX idx_identifier_verification_status ON identifier_verification_history(verification_status);
CREATE INDEX idx_identifier_verification_type ON identifier_verification_history(identifier_type);
CREATE INDEX idx_identifier_verification_created ON identifier_verification_history(created_at DESC);

-- Updated at trigger
CREATE TRIGGER update_identifier_verification_updated_at
  BEFORE UPDATE ON identifier_verification_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE identifier_verification_history IS 'Generic identifier verification history for LEI, EORI, DUNS, and other business identifiers';
COMMENT ON COLUMN identifier_verification_history.verification_method IS 'Method used: document_upload, api_validation, manual_review';
COMMENT ON COLUMN identifier_verification_history.verification_status IS 'Status: pending, verified, failed, flagged';
COMMENT ON COLUMN identifier_verification_history.extracted_data IS 'Data extracted from document or API (JSON)';
