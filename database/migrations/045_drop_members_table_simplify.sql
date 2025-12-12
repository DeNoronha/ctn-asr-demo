-- Migration: 045_drop_members_table_simplify.sql
-- Description: Drop members table and simplify schema (KISS principle)
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- The members table was redundant with legal_entity:
-- - members.id -> unnecessary (legal_entity_id exists)
-- - members.org_id -> inconsistent data (sometimes "org:name", sometimes UUID)
-- - members.email -> all "noreply@example.com" (useless, contacts have real emails)
-- - members.azure_ad_object_id -> always NULL (never populated)
-- - members.metadata -> duplicate of legal_entity.metadata
-- - members.legal_entity_id -> only useful column (FK)
--
-- After this migration:
-- - legal_entity is the single source of truth for member organizations
-- - issued_tokens.member_id renamed to legal_entity_id (FK to legal_entity)
-- - 3 member views dropped (vw_members_full, vw_members_list, vw_members)
-- - 1 new simple view created (vw_legal_entities) for member listing
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Add azure_ad_object_id to legal_entity (for future Azure AD integration)
-- ============================================================================

ALTER TABLE public.legal_entity
ADD COLUMN IF NOT EXISTS azure_ad_object_id uuid;

COMMENT ON COLUMN public.legal_entity.azure_ad_object_id IS 'Azure AD B2C object ID for the organization. Used for Azure AD authentication integration.';

-- ============================================================================
-- PART 2: Update issued_tokens to reference legal_entity directly
-- ============================================================================

-- FIRST drop the old FK constraint (must happen before UPDATE to avoid constraint violation)
ALTER TABLE public.issued_tokens
DROP CONSTRAINT IF EXISTS issued_tokens_member_id_fkey;

-- Now update existing issued_tokens to use legal_entity_id instead of member.id
UPDATE public.issued_tokens it
SET member_id = m.legal_entity_id
FROM public.members m
WHERE it.member_id = m.id;

-- Rename the column for clarity
ALTER TABLE public.issued_tokens
RENAME COLUMN member_id TO legal_entity_id;

-- Add new FK constraint to legal_entity
ALTER TABLE public.issued_tokens
ADD CONSTRAINT issued_tokens_legal_entity_id_fkey
FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE;

-- ============================================================================
-- PART 3: Drop the 3 member views
-- ============================================================================

DROP VIEW IF EXISTS public.vw_members_full CASCADE;
DROP VIEW IF EXISTS public.vw_members_list CASCADE;
DROP VIEW IF EXISTS public.vw_members CASCADE;

-- ============================================================================
-- PART 4: Drop the members table
-- ============================================================================

DROP TABLE IF EXISTS public.members CASCADE;

-- ============================================================================
-- PART 5: Create a simple view for member listing (replaces vw_members_full)
-- ============================================================================

CREATE VIEW public.vw_legal_entities AS
SELECT
    le.legal_entity_id,
    le.party_id,
    le.primary_legal_name,
    le.domain,
    le.status,
    le.membership_level,
    le.authentication_tier,
    le.authentication_method,
    le.dt_created,
    le.dt_modified,
    le.metadata,
    -- Pivoted identifier columns
    MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value END) AS kvk,
    MAX(CASE WHEN len.identifier_type = 'LEI' THEN len.identifier_value END) AS lei,
    MAX(CASE WHEN len.identifier_type = 'EUID' THEN len.identifier_value END) AS euid,
    MAX(CASE WHEN len.identifier_type = 'EORI' THEN len.identifier_value END) AS eori,
    MAX(CASE WHEN len.identifier_type = 'DUNS' THEN len.identifier_value END) AS duns,
    MAX(CASE WHEN len.identifier_type = 'VAT' THEN len.identifier_value END) AS vat,
    -- Counts
    COUNT(DISTINCT lec.legal_entity_contact_id) FILTER (WHERE lec.is_deleted = false) AS contact_count,
    COUNT(DISTINCT lee.legal_entity_endpoint_id) FILTER (WHERE lee.is_deleted = false) AS endpoint_count
FROM public.legal_entity le
LEFT JOIN public.legal_entity_number len
    ON le.legal_entity_id = len.legal_entity_id
    AND (len.is_deleted = false OR len.is_deleted IS NULL)
LEFT JOIN public.legal_entity_contact lec
    ON le.legal_entity_id = lec.legal_entity_id
LEFT JOIN public.legal_entity_endpoint lee
    ON le.legal_entity_id = lee.legal_entity_id
WHERE le.is_deleted = false
GROUP BY
    le.legal_entity_id, le.party_id, le.primary_legal_name, le.domain,
    le.status, le.membership_level, le.authentication_tier, le.authentication_method,
    le.dt_created, le.dt_modified, le.metadata;

COMMENT ON VIEW public.vw_legal_entities IS 'Legal entities with pivoted identifiers and counts. Replaces the dropped vw_members_full view. Dec 12, 2025.';

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
BEGIN
    -- Check members table is dropped
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'members'
    ) THEN
        RAISE EXCEPTION 'Migration failed: members table still exists';
    END IF;

    -- Check old views are dropped
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public' AND table_name IN ('vw_members_full', 'vw_members_list', 'vw_members')
    ) THEN
        RAISE EXCEPTION 'Migration failed: old member views still exist';
    END IF;

    -- Check new view exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'vw_legal_entities'
    ) THEN
        RAISE EXCEPTION 'Migration failed: vw_legal_entities view not created';
    END IF;

    -- Check issued_tokens column renamed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'issued_tokens' AND column_name = 'legal_entity_id'
    ) THEN
        RAISE EXCEPTION 'Migration failed: issued_tokens.legal_entity_id column not found';
    END IF;

    RAISE NOTICE 'Migration 045_drop_members_table_simplify completed successfully';
    RAISE NOTICE 'Dropped: members table, vw_members_full, vw_members_list, vw_members views';
    RAISE NOTICE 'Created: vw_legal_entities view';
    RAISE NOTICE 'Updated: issued_tokens.member_id -> legal_entity_id';
END $$;
