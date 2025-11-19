-- =====================================================
-- Migration 030: Optional Enum CHECK Constraints
-- Date: November 14, 2025 (OPTIONAL - LOW PRIORITY)
-- Purpose: Add CHECK constraints for remaining enum fields
-- Reference: DATABASE_CONSTRAINT_REVIEW_2025-11-14.md
-- =====================================================
-- STATUS: OPTIONAL ENHANCEMENT
--
-- These constraints enforce enum values at the database level
-- for defense-in-depth. Application code already validates these
-- values, so this migration is LOW PRIORITY.
--
-- Benefits:
-- - Prevents invalid data from external scripts/tools
-- - Explicit documentation of valid values in schema
-- - Catches programming errors before production
--
-- Risks: NONE (values already validated in app code)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. legal_entity_number - Identifier Type Constraint
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding CHECK constraint for legal_entity_number.identifier_type...';
END $$;

ALTER TABLE legal_entity_number
  DROP CONSTRAINT IF EXISTS chk_identifier_type_valid;

ALTER TABLE legal_entity_number
  ADD CONSTRAINT chk_identifier_type_valid
    CHECK (identifier_type IN (
      'KVK',    -- Netherlands Chamber of Commerce
      'LEI',    -- Legal Entity Identifier (global)
      'EORI',   -- Economic Operators Registration (EU)
      'VAT',    -- VAT Number (EU)
      'DUNS',   -- Dun & Bradstreet Number (global)
      'EUID',   -- European Unique Identifier
      'HRB',    -- German Commercial Register Part B
      'HRA',    -- German Commercial Register Part A
      'KBO',    -- Belgian Crossroads Bank for Enterprises
      'SIREN',  -- French Business Registry - SIREN
      'SIRET',  -- French Business Registry - SIRET
      'CRN',    -- UK Companies House Registration Number
      'OTHER'   -- Other identifier types
    ));

COMMENT ON CONSTRAINT chk_identifier_type_valid ON legal_entity_number IS
  'Ensures identifier_type is one of the valid business registration identifier types';

-- =====================================================
-- 2. legal_entity_number - Validation Status Constraint
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding CHECK constraint for legal_entity_number.validation_status...';
END $$;

ALTER TABLE legal_entity_number
  DROP CONSTRAINT IF EXISTS chk_validation_status_valid;

ALTER TABLE legal_entity_number
  ADD CONSTRAINT chk_validation_status_valid
    CHECK (validation_status IN (
      'PENDING',    -- Awaiting verification
      'VALIDATED',  -- Successfully verified in registry
      'VERIFIED',   -- Successfully verified (alternate spelling)
      'FAILED',     -- Verification failed
      'EXPIRED'     -- Validation expired (needs re-verification)
    ));

COMMENT ON CONSTRAINT chk_validation_status_valid ON legal_entity_number IS
  'Ensures validation_status is one of: PENDING, VALIDATED, VERIFIED, FAILED, EXPIRED';

-- =====================================================
-- 3. legal_entity_endpoint - Endpoint Type Constraint
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding CHECK constraint for legal_entity_endpoint.endpoint_type...';
END $$;

ALTER TABLE legal_entity_endpoint
  DROP CONSTRAINT IF EXISTS chk_endpoint_type_valid;

ALTER TABLE legal_entity_endpoint
  ADD CONSTRAINT chk_endpoint_type_valid
    CHECK (endpoint_type IN (
      'REST',      -- RESTful API endpoint (deprecated)
      'REST_API',  -- RESTful API endpoint (current)
      'SOAP',      -- SOAP/XML endpoint
      'WEBHOOK',   -- Webhook callback URL
      'OTHER'      -- Other endpoint types
    ));

COMMENT ON CONSTRAINT chk_endpoint_type_valid ON legal_entity_endpoint IS
  'Ensures endpoint_type is one of: REST, REST_API, SOAP, WEBHOOK, OTHER';

-- =====================================================
-- 4. legal_entity_endpoint - Verification Status Constraint
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding CHECK constraint for legal_entity_endpoint.verification_status...';
END $$;

ALTER TABLE legal_entity_endpoint
  DROP CONSTRAINT IF EXISTS chk_endpoint_verification_status_valid;

ALTER TABLE legal_entity_endpoint
  ADD CONSTRAINT chk_endpoint_verification_status_valid
    CHECK (verification_status IN (
      'PENDING',  -- Awaiting verification
      'SENT',     -- Verification challenge sent
      'VERIFIED', -- Successfully verified (responded to challenge)
      'FAILED',   -- Verification failed
      'EXPIRED'   -- Verification expired (needs re-verification)
    ));

COMMENT ON CONSTRAINT chk_endpoint_verification_status_valid ON legal_entity_endpoint IS
  'Ensures verification_status is one of: PENDING, SENT, VERIFIED, FAILED, EXPIRED';

-- =====================================================
-- 5. ctn_m2m_credentials - Auth Provider Constraint
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding CHECK constraint for ctn_m2m_credentials.auth_provider...';
END $$;

ALTER TABLE ctn_m2m_credentials
  DROP CONSTRAINT IF EXISTS chk_auth_provider_valid;

ALTER TABLE ctn_m2m_credentials
  ADD CONSTRAINT chk_auth_provider_valid
    CHECK (LOWER(auth_provider) IN (
      'keycloak',  -- Cloud IAM Keycloak instance
      'zitadel',   -- Zitadel instance (deprecated)
      'azure_ad',  -- Azure Active Directory (future)
      'other'      -- Other OAuth2/OIDC providers
    ));

COMMENT ON CONSTRAINT chk_auth_provider_valid ON ctn_m2m_credentials IS
  'Ensures auth_provider is one of: keycloak, zitadel, azure_ad, other (case-insensitive)';

-- =====================================================
-- 6. Verification Queries
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Running verification queries...';
END $$;

-- Count existing values that would violate constraints
DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  -- Check identifier_type
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM legal_entity_number
  WHERE identifier_type NOT IN ('KVK', 'LEI', 'EORI', 'VAT', 'DUNS', 'EUID', 'HRB', 'HRA', 'KBO', 'SIREN', 'SIRET', 'CRN', 'OTHER');

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % invalid identifier_type values. Migration aborted.', v_invalid_count;
  ELSE
    RAISE NOTICE '✓ All identifier_type values are valid';
  END IF;

  -- Check validation_status
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM legal_entity_number
  WHERE validation_status NOT IN ('PENDING', 'VALIDATED', 'VERIFIED', 'FAILED', 'EXPIRED')
    AND validation_status IS NOT NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % invalid validation_status values. Migration aborted.', v_invalid_count;
  ELSE
    RAISE NOTICE '✓ All validation_status values are valid';
  END IF;

  -- Check endpoint_type
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM legal_entity_endpoint
  WHERE endpoint_type NOT IN ('REST', 'REST_API', 'SOAP', 'WEBHOOK', 'OTHER')
    AND endpoint_type IS NOT NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % invalid endpoint_type values. Migration aborted.', v_invalid_count;
  ELSE
    RAISE NOTICE '✓ All endpoint_type values are valid';
  END IF;

  -- Check endpoint verification_status
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM legal_entity_endpoint
  WHERE verification_status NOT IN ('PENDING', 'SENT', 'VERIFIED', 'FAILED', 'EXPIRED')
    AND verification_status IS NOT NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % invalid endpoint verification_status values. Migration aborted.', v_invalid_count;
  ELSE
    RAISE NOTICE '✓ All endpoint verification_status values are valid';
  END IF;

  -- Check auth_provider
  SELECT COUNT(*)
  INTO v_invalid_count
  FROM ctn_m2m_credentials
  WHERE LOWER(auth_provider) NOT IN ('keycloak', 'zitadel', 'azure_ad', 'other')
    AND auth_provider IS NOT NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % invalid auth_provider values. Migration aborted.', v_invalid_count;
  ELSE
    RAISE NOTICE '✓ All auth_provider values are valid';
  END IF;

  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Migration 030 completed successfully!';
  RAISE NOTICE '==============================================';
END $$;

COMMIT;

-- =====================================================
-- Rollback Instructions
-- =====================================================
-- To rollback this migration:
--
-- BEGIN;
--
-- ALTER TABLE legal_entity_number
--   DROP CONSTRAINT IF EXISTS chk_identifier_type_valid;
--
-- ALTER TABLE legal_entity_number
--   DROP CONSTRAINT IF EXISTS chk_validation_status_valid;
--
-- ALTER TABLE legal_entity_endpoint
--   DROP CONSTRAINT IF EXISTS chk_endpoint_type_valid;
--
-- ALTER TABLE legal_entity_endpoint
--   DROP CONSTRAINT IF EXISTS chk_endpoint_verification_status_valid;
--
-- ALTER TABLE ctn_m2m_credentials
--   DROP CONSTRAINT IF EXISTS chk_auth_provider_valid;
--
-- COMMIT;
-- =====================================================
