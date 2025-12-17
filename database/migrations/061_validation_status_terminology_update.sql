-- Migration 061: Update validation_status terminology
-- Date: 2025-12-17
-- Author: claude-enrichment
--
-- Purpose: Align validation_status values with industry standards (GLEIF, KVK, VIES).
-- The previous model confused ACTIONS (verify, derive, validate) with RESULTS (valid, invalid).
--
-- New Model:
--   VALID          - Confirmed valid by registry API or derivation rules
--   INVALID        - Registry confirmed identifier does not exist or failed validation
--   PENDING        - Not yet checked/verified (unchanged)
--   EXPIRED        - Was valid but verification expired (unchanged)
--   NOT_VERIFIABLE - Cannot be verified (no registry API exists for this identifier type)
--
-- Migration Mapping:
--   VERIFIED  -> VALID    (externally verified via API)
--   VALIDATED -> VALID    (format/structure validated)
--   DERIVED   -> VALID    (mathematically derived from verified source)
--   FAILED    -> INVALID  (verification failed)
--   PENDING   -> PENDING  (unchanged)
--   EXPIRED   -> EXPIRED  (unchanged)

BEGIN;

-- Phase 1: Add new statuses to constraint (backward compatible)
-- This allows both old and new values during the transition
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS chk_validation_status_valid;

ALTER TABLE legal_entity_number
ADD CONSTRAINT chk_validation_status_valid
CHECK (validation_status IN (
  -- New values
  'PENDING', 'VALID', 'INVALID', 'EXPIRED', 'NOT_VERIFIABLE',
  -- Legacy values (temporary, for migration)
  'VALIDATED', 'VERIFIED', 'FAILED', 'DERIVED'
));

-- Phase 2: Migrate existing data
-- VERIFIED -> VALID (externally verified via registry API)
UPDATE legal_entity_number
SET validation_status = 'VALID', dt_modified = NOW()
WHERE validation_status = 'VERIFIED';

-- VALIDATED -> VALID (format validated)
UPDATE legal_entity_number
SET validation_status = 'VALID', dt_modified = NOW()
WHERE validation_status = 'VALIDATED';

-- DERIVED -> VALID (mathematically derived identifiers are valid by definition)
-- Example: Belgian VAT derived from KBO number
UPDATE legal_entity_number
SET validation_status = 'VALID', dt_modified = NOW()
WHERE validation_status = 'DERIVED';

-- FAILED -> INVALID
UPDATE legal_entity_number
SET validation_status = 'INVALID', dt_modified = NOW()
WHERE validation_status = 'FAILED';

-- PENDING and EXPIRED remain unchanged

-- Phase 3: Remove legacy values from constraint
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS chk_validation_status_valid;

ALTER TABLE legal_entity_number
ADD CONSTRAINT chk_validation_status_valid
CHECK (validation_status IN ('PENDING', 'VALID', 'INVALID', 'EXPIRED', 'NOT_VERIFIABLE'));

-- Update column comment to reflect new terminology
COMMENT ON COLUMN legal_entity_number.validation_status IS
'Validation result status:
  PENDING        - Not yet checked/verified
  VALID          - Confirmed valid by registry API or derivation rules
  INVALID        - Registry confirmed identifier does not exist or failed validation
  EXPIRED        - Was valid but verification has expired
  NOT_VERIFIABLE - Cannot be verified (no registry API exists for this identifier type)';

COMMIT;

-- Verify migration
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Check for any remaining legacy values (should be 0)
  SELECT COUNT(*) INTO invalid_count
  FROM legal_entity_number
  WHERE validation_status NOT IN ('PENDING', 'VALID', 'INVALID', 'EXPIRED', 'NOT_VERIFIABLE')
    AND is_deleted = false;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % records still have legacy validation_status values', invalid_count;
  END IF;

  RAISE NOTICE 'Migration 061_validation_status_terminology_update completed successfully';
  RAISE NOTICE 'All validation_status values have been migrated to new terminology';
END $$;
