-- Migration 022: Identifier Verification History Table
-- Date: November 6, 2025
-- Description: Generic identifier verification system for LEI, EORI, DUNS, etc.

-- Create identifier_verification_history table
CREATE TABLE IF NOT EXISTS identifier_verification_history (
    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,
    identifier_id UUID NOT NULL REFERENCES legal_entity_number(legal_entity_reference_id) ON DELETE CASCADE,
    identifier_type VARCHAR(50) NOT NULL, -- LEI, EORI, DUNS, KVK, etc.
    identifier_value VARCHAR(255) NOT NULL,
    verification_method VARCHAR(100) NOT NULL, -- 'document_upload', 'api_verification', 'manual_review', etc.
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'requires_review'
    document_blob_url TEXT, -- Azure Blob Storage URL for uploaded documents
    document_filename VARCHAR(500),
    document_mime_type VARCHAR(100),
    extracted_data JSONB, -- OCR/AI extracted data from documents
    verified_by VARCHAR(255), -- Admin who verified (email or user ID)
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_legal_entity
    ON identifier_verification_history(legal_entity_id);

CREATE INDEX IF NOT EXISTS idx_verification_identifier
    ON identifier_verification_history(identifier_id);

CREATE INDEX IF NOT EXISTS idx_verification_status
    ON identifier_verification_history(verification_status);

CREATE INDEX IF NOT EXISTS idx_verification_type
    ON identifier_verification_history(identifier_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_identifier_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_identifier_verification_updated_at
    BEFORE UPDATE ON identifier_verification_history
    FOR EACH ROW
    EXECUTE FUNCTION update_identifier_verification_updated_at();

-- Add comments for documentation
COMMENT ON TABLE identifier_verification_history IS 'Tracks verification history for all identifier types (LEI, EORI, DUNS, etc.)';
COMMENT ON COLUMN identifier_verification_history.verification_id IS 'Unique verification record ID';
COMMENT ON COLUMN identifier_verification_history.legal_entity_id IS 'Legal entity being verified';
COMMENT ON COLUMN identifier_verification_history.identifier_id IS 'Identifier being verified (FK to legal_entity_number)';
COMMENT ON COLUMN identifier_verification_history.identifier_type IS 'Type of identifier (LEI, EORI, DUNS, KVK, etc.)';
COMMENT ON COLUMN identifier_verification_history.identifier_value IS 'The identifier value being verified';
COMMENT ON COLUMN identifier_verification_history.verification_method IS 'How verification was performed (document_upload, api_verification, manual_review)';
COMMENT ON COLUMN identifier_verification_history.verification_status IS 'Current status (pending, approved, rejected, requires_review)';
COMMENT ON COLUMN identifier_verification_history.document_blob_url IS 'Azure Blob Storage URL for uploaded verification documents';
COMMENT ON COLUMN identifier_verification_history.extracted_data IS 'OCR/AI extracted data from uploaded documents (Document Intelligence)';
COMMENT ON COLUMN identifier_verification_history.verified_by IS 'Admin user who performed verification';
COMMENT ON COLUMN identifier_verification_history.verified_at IS 'Timestamp of verification approval/rejection';
COMMENT ON COLUMN identifier_verification_history.verification_notes IS 'Admin notes about verification decision';
