-- Migration 060: Add DERIVED to validation_status constraint
-- Date: 2025-12-17
-- Author: claude-enrichment
--
-- Purpose: Belgian VAT numbers are derived from KBO numbers, not directly verified.
-- Adding 'DERIVED' status allows tracking of identifiers that are mathematically
-- derived from other verified identifiers.

-- Drop and recreate the constraint with DERIVED added
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS chk_validation_status_valid;

ALTER TABLE legal_entity_number
ADD CONSTRAINT chk_validation_status_valid
CHECK (validation_status IN ('PENDING', 'VALIDATED', 'VERIFIED', 'FAILED', 'EXPIRED', 'DERIVED'));

-- Add comment explaining the statuses
COMMENT ON COLUMN legal_entity_number.validation_status IS
'Validation status: PENDING (not yet checked), VALIDATED (format validated), VERIFIED (externally verified), FAILED (verification failed), EXPIRED (verification expired), DERIVED (mathematically derived from another identifier)';
