-- Migration: 040_drop_unused_tables.sql
-- Description: Drop unused tables with zero records that are not referenced in code
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- The following tables have been identified as unused after analysis:
--
-- 1. vetting_records (0 rows)
--    - Created for member vetting workflow
--    - No code references in API, admin-portal, or member-portal
--    - Never implemented
--
-- 2. oauth_clients (0 rows)
--    - Originally for OAuth 2.0 client registrations
--    - Keycloak is used via ctn_m2m_credentials table instead
--    - No code references in API, admin-portal, or member-portal
--
-- 3. audit_log_pii_access (0 rows)
--    - Part of GDPR audit logging for PII de-anonymization tracking
--    - Only referenced in legacy archive (functions-legacy-archive/)
--    - No active code references
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop vetting_records table
-- ============================================================================

DROP TABLE IF EXISTS public.vetting_records CASCADE;

-- ============================================================================
-- PART 2: Drop oauth_clients table
-- ============================================================================

DROP TABLE IF EXISTS public.oauth_clients CASCADE;

-- ============================================================================
-- PART 3: Drop audit_log_pii_access table
-- ============================================================================

DROP TABLE IF EXISTS public.audit_log_pii_access CASCADE;

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check vetting_records is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'vetting_records'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: vetting_records table still exists';
    END IF;

    -- Check oauth_clients is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'oauth_clients'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: oauth_clients table still exists';
    END IF;

    -- Check audit_log_pii_access is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_log_pii_access'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: audit_log_pii_access table still exists';
    END IF;

    RAISE NOTICE 'Migration 040_drop_unused_tables completed successfully';
    RAISE NOTICE 'Dropped tables: vetting_records, oauth_clients, audit_log_pii_access';
END $$;
