-- =====================================================
-- Endpoint Verification Enhancement Migration
-- Implements: Token-based endpoint verification workflow
-- Date: November 10, 2025
-- Purpose: Add verification tracking fields for member
--          endpoint registration with email verification
-- =====================================================

-- =====================================================
-- Add verification fields to legal_entity_endpoint
-- =====================================================
ALTER TABLE legal_entity_endpoint
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS test_result_data JSONB;

-- =====================================================
-- Add CHECK constraint for verification_status enum
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_verification_status'
  ) THEN
    ALTER TABLE legal_entity_endpoint
      ADD CONSTRAINT chk_verification_status
      CHECK (verification_status IN ('PENDING', 'SENT', 'VERIFIED', 'FAILED', 'EXPIRED'));
  END IF;
END $$;

-- =====================================================
-- Add indexes for verification queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_endpoint_verification_status
  ON legal_entity_endpoint(verification_status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_endpoint_verification_expires
  ON legal_entity_endpoint(verification_expires_at)
  WHERE verification_expires_at IS NOT NULL
    AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_endpoint_verification_token
  ON legal_entity_endpoint(verification_token)
  WHERE verification_token IS NOT NULL
    AND is_deleted = false;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON COLUMN legal_entity_endpoint.verification_token IS
  'One-time verification token sent via email. Expires after 24 hours.';

COMMENT ON COLUMN legal_entity_endpoint.verification_status IS
  'Status: PENDING (created), SENT (email sent), VERIFIED (token validated), FAILED (test failed), EXPIRED (token expired)';

COMMENT ON COLUMN legal_entity_endpoint.verification_sent_at IS
  'Timestamp when verification email was sent to member';

COMMENT ON COLUMN legal_entity_endpoint.verification_expires_at IS
  'Token expiration timestamp (24 hours from sent_at)';

COMMENT ON COLUMN legal_entity_endpoint.test_result_data IS
  'JSON data returned from test API call during verification';
