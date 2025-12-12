-- Migration: 044_drop_vw_legal_entity_full.sql
-- Description: Drop unused vw_legal_entity_full view
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- The vw_legal_entity_full view is being dropped because:
-- 1. Only used by GET /v1/members/:id endpoint
-- 2. The getMember() function that calls this endpoint is never used in the UI
-- 3. The admin portal fetches contacts, endpoints, identifiers separately
-- 4. Redundant with vw_members_full which is actively used
--
-- ============================================================================

BEGIN;

DROP VIEW IF EXISTS public.vw_legal_entity_full CASCADE;

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'vw_legal_entity_full'
    ) THEN
        RAISE EXCEPTION 'Migration failed: vw_legal_entity_full view still exists';
    END IF;

    RAISE NOTICE 'Migration 044_drop_vw_legal_entity_full completed successfully';
END $$;
