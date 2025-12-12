-- Migration: 043_rename_views_vw_prefix.sql
-- Description: Rename all views to use consistent vw_ prefix
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- Standardizing view naming convention:
-- - All views should use vw_ prefix for consistency
-- - Renaming existing v_ and other naming patterns to vw_
--
-- Views being renamed:
-- 1. v_members_full          -> vw_members_full
-- 2. v_members_list          -> vw_members_list
-- 3. v_m2m_clients_active    -> vw_m2m_clients_active
-- 4. v_m2m_credentials_active -> vw_m2m_credentials_active
-- 5. v_audit_log_summary     -> vw_audit_log_summary
-- 6. v_identifiers_with_type -> vw_identifiers_with_type
-- 7. members_view            -> vw_members
-- 8. legal_entity_full       -> vw_legal_entity_full
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Rename v_ prefixed views to vw_
-- ============================================================================

ALTER VIEW IF EXISTS public.v_members_full RENAME TO vw_members_full;
ALTER VIEW IF EXISTS public.v_members_list RENAME TO vw_members_list;
ALTER VIEW IF EXISTS public.v_m2m_clients_active RENAME TO vw_m2m_clients_active;
ALTER VIEW IF EXISTS public.v_m2m_credentials_active RENAME TO vw_m2m_credentials_active;
ALTER VIEW IF EXISTS public.v_audit_log_summary RENAME TO vw_audit_log_summary;
ALTER VIEW IF EXISTS public.v_identifiers_with_type RENAME TO vw_identifiers_with_type;

-- ============================================================================
-- PART 2: Rename other views to vw_ prefix
-- ============================================================================

ALTER VIEW IF EXISTS public.members_view RENAME TO vw_members;
ALTER VIEW IF EXISTS public.legal_entity_full RENAME TO vw_legal_entity_full;

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    view_count INTEGER;
BEGIN
    -- Count views with vw_ prefix
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name LIKE 'vw_%';

    IF view_count < 8 THEN
        RAISE EXCEPTION 'Migration failed: Expected at least 8 views with vw_ prefix, found %', view_count;
    END IF;

    -- Check that old view names no longer exist
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public'
        AND table_name IN ('v_members_full', 'v_members_list', 'v_m2m_clients_active',
                          'v_m2m_credentials_active', 'v_audit_log_summary',
                          'v_identifiers_with_type', 'members_view', 'legal_entity_full')
    ) THEN
        RAISE EXCEPTION 'Migration failed: Old view names still exist';
    END IF;

    RAISE NOTICE 'Migration 043_rename_views_vw_prefix completed successfully';
    RAISE NOTICE 'Renamed 8 views to use vw_ prefix';
END $$;
