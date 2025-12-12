-- Migration: 042_drop_bdi_audit_tables.sql
-- Description: Drop BDI token tables and audit_log_pii_mapping
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- The following tables are being dropped as the features were never fully
-- implemented or used:
--
-- 1. bvod_validation_log (0 rows)
--    - BDI token validation logging
--    - API endpoint /v1/bdi/tokens/validate removed
--    - Has FK to bdi_orchestrations (CASCADE will handle)
--
-- 2. bvad_issued_tokens (0 rows)
--    - BDI token issuance tracking
--    - API endpoint /v1/bdi/tokens/generate removed
--
-- 3. bdi_orchestrations (0 rows)
--    - BDI orchestration records
--    - Feature never implemented
--
-- 4. audit_log_pii_mapping (0 rows)
--    - GDPR PII pseudonymization mapping
--    - Pseudonymization feature removed (not implemented)
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop bvod_validation_log (references bdi_orchestrations)
-- ============================================================================

DROP TABLE IF EXISTS public.bvod_validation_log CASCADE;

-- ============================================================================
-- PART 2: Drop bvad_issued_tokens
-- ============================================================================

DROP TABLE IF EXISTS public.bvad_issued_tokens CASCADE;

-- ============================================================================
-- PART 3: Drop bdi_orchestrations (now safe after dependent table dropped)
-- ============================================================================

DROP TABLE IF EXISTS public.bdi_orchestrations CASCADE;

-- ============================================================================
-- PART 4: Drop audit_log_pii_mapping
-- ============================================================================

DROP TABLE IF EXISTS public.audit_log_pii_mapping CASCADE;

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check bvod_validation_log is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bvod_validation_log'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: bvod_validation_log table still exists';
    END IF;

    -- Check bvad_issued_tokens is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bvad_issued_tokens'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: bvad_issued_tokens table still exists';
    END IF;

    -- Check bdi_orchestrations is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bdi_orchestrations'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: bdi_orchestrations table still exists';
    END IF;

    -- Check audit_log_pii_mapping is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_log_pii_mapping'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: audit_log_pii_mapping table still exists';
    END IF;

    RAISE NOTICE 'Migration 042_drop_bdi_audit_tables completed successfully';
    RAISE NOTICE 'Dropped tables: bvod_validation_log, bvad_issued_tokens, bdi_orchestrations, audit_log_pii_mapping';
END $$;
