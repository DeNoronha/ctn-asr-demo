-- Migration: 041_drop_unused_bdi_tables.sql
-- Description: Drop unused BDI and endpoint authorization tables
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- The following tables have been identified as unused after codebase analysis:
--
-- 1. endpoint_authorization (3 rows, only in legacy archive)
--    - API endpoints for issuing/managing tokens were never implemented
--    - Frontend code referenced non-existent API endpoints
--    - Token functionality not used - Keycloak handles M2M auth instead
--
-- 2. bdi_external_systems (1 row, only in legacy archive)
--    - Part of BDI (Business Data Interchange) feature never fully implemented
--    - No active code references
--
-- 3. bdi_orchestration_participants (0 rows, only in legacy archive)
--    - Part of BDI orchestration feature never implemented
--    - References bdi_orchestrations table (FK cascade)
--    - No active code references
--
-- Note: bdi_orchestrations table is kept as it still has FK references from
-- bvod_validation_log which IS actively used.
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop bdi_orchestration_participants (has FK to bdi_orchestrations)
-- ============================================================================

DROP TABLE IF EXISTS public.bdi_orchestration_participants CASCADE;

-- ============================================================================
-- PART 2: Drop bdi_external_systems
-- ============================================================================

DROP TABLE IF EXISTS public.bdi_external_systems CASCADE;

-- ============================================================================
-- PART 3: Drop endpoint_authorization (has FK to legal_entity_endpoint)
-- ============================================================================

DROP TABLE IF EXISTS public.endpoint_authorization CASCADE;

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check endpoint_authorization is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'endpoint_authorization'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: endpoint_authorization table still exists';
    END IF;

    -- Check bdi_external_systems is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bdi_external_systems'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: bdi_external_systems table still exists';
    END IF;

    -- Check bdi_orchestration_participants is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bdi_orchestration_participants'
    ) INTO table_exists;

    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: bdi_orchestration_participants table still exists';
    END IF;

    RAISE NOTICE 'Migration 041_drop_unused_bdi_tables completed successfully';
    RAISE NOTICE 'Dropped tables: endpoint_authorization, bdi_external_systems, bdi_orchestration_participants';
END $$;
