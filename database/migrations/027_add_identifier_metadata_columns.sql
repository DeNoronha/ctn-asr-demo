-- Migration 027: Add metadata columns to legal_entity_number table
-- Date: 2025-11-20
-- Purpose: Add issuing_authority, issued_at, expires_at, and verification_status columns
--          to support full identifier lifecycle management

-- Add issuing_authority column (e.g., "Dutch Chamber of Commerce", "LEI Foundation")
ALTER TABLE legal_entity_number
ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(255);

-- Add issued_at column (when the identifier was issued)
ALTER TABLE legal_entity_number
ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP;

-- Add expires_at column (when the identifier expires, if applicable)
ALTER TABLE legal_entity_number
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Add verification_status column with CHECK constraint
ALTER TABLE legal_entity_number
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING';

-- Add CHECK constraint for verification_status
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS legal_entity_number_verification_status_check;

ALTER TABLE legal_entity_number
ADD CONSTRAINT legal_entity_number_verification_status_check
CHECK (verification_status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'));

-- Add index on verification_status for performance
CREATE INDEX IF NOT EXISTS idx_legal_entity_number_verification_status
ON legal_entity_number(verification_status)
WHERE is_deleted = false;

-- Add comment to document the new columns
COMMENT ON COLUMN legal_entity_number.issuing_authority IS 'Authority that issued the identifier (e.g., Chamber of Commerce, LEI Foundation)';
COMMENT ON COLUMN legal_entity_number.issued_at IS 'Date when the identifier was issued';
COMMENT ON COLUMN legal_entity_number.expires_at IS 'Date when the identifier expires (NULL if no expiration)';
COMMENT ON COLUMN legal_entity_number.verification_status IS 'Verification status: PENDING (awaiting verification), VERIFIED (confirmed valid), FAILED (verification failed), EXPIRED (no longer valid)';

-- Update existing rows to have PENDING status if NULL
UPDATE legal_entity_number
SET verification_status = 'PENDING'
WHERE verification_status IS NULL;