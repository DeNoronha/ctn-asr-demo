-- Migration: 039_drop_redundant_registry_tables.sql
-- Description: Drop redundant company_registries table and company_identifiers_with_registry view
--              The legal_entity_number_type lookup table (migration 036) replaces company_registries
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- CONTEXT
-- ============================================================================
--
-- We have three overlapping structures for identifier type metadata:
--
-- 1. company_registries (TABLE) - Original lookup table with registry metadata
--    - registry_code, registry_name, country_code, registry_url, etc.
--    - NOT referenced by API or frontend code
--
-- 2. legal_entity_number_type (TABLE) - NEW lookup table from migration 036
--    - type_code, type_name, country_scope, format_regex, registry_url, etc.
--    - Referenced via FK constraint from legal_entity_number.identifier_type
--    - More comprehensive with validation patterns
--
-- 3. legal_entity_number (TABLE) - Stores actual identifier values
--    - Has inline registry_name and registry_url columns (denormalized)
--    - FK to legal_entity_number_type.type_code
--
-- The company_registries table and company_identifiers_with_registry view are
-- now redundant because:
-- - legal_entity_number_type provides the same lookup functionality
-- - legal_entity_number already has registry_name/registry_url denormalized
-- - Neither the API nor frontend reference company_registries directly
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop the redundant view first (depends on company_registries)
-- ============================================================================

DROP VIEW IF EXISTS public.company_identifiers_with_registry CASCADE;

COMMENT ON SCHEMA public IS 'Dropped company_identifiers_with_registry view - redundant with legal_entity_number having inline registry_name/registry_url columns';

-- ============================================================================
-- PART 2: Drop the redundant company_registries table
-- ============================================================================

DROP TABLE IF EXISTS public.company_registries CASCADE;

-- ============================================================================
-- PART 3: Create a replacement view that uses legal_entity_number_type
-- ============================================================================

-- Create a new view that joins legal_entity_number with legal_entity_number_type
-- This provides the same functionality as company_identifiers_with_registry
-- but uses the new lookup table structure

CREATE OR REPLACE VIEW public.v_identifiers_with_type AS
SELECT
    len.legal_entity_reference_id,
    len.legal_entity_id,
    len.identifier_type,
    len.identifier_value,
    len.country_code,
    len.validation_status,
    len.validation_date,
    len.registry_name,
    len.registry_url,
    len.is_deleted,
    -- From lookup table
    lent.type_name,
    lent.description AS type_description,
    lent.country_scope,
    lent.format_regex,
    lent.format_example,
    lent.registry_url AS type_registry_url,
    lent.is_active AS type_is_active
FROM legal_entity_number len
LEFT JOIN legal_entity_number_type lent ON len.identifier_type = lent.type_code
WHERE len.is_deleted = false OR len.is_deleted IS NULL;

COMMENT ON VIEW public.v_identifiers_with_type IS 'Identifiers enriched with type metadata from legal_entity_number_type lookup table';

COMMIT;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    tables_remaining BOOLEAN;
    view_exists BOOLEAN;
BEGIN
    -- Check company_registries is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'company_registries'
    ) INTO tables_remaining;

    IF tables_remaining THEN
        RAISE EXCEPTION 'Migration failed: company_registries table still exists';
    END IF;

    -- Check old view is dropped
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'company_identifiers_with_registry'
    ) INTO view_exists;

    IF view_exists THEN
        RAISE EXCEPTION 'Migration failed: company_identifiers_with_registry view still exists';
    END IF;

    -- Check new view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'v_identifiers_with_type'
    ) INTO view_exists;

    IF NOT view_exists THEN
        RAISE EXCEPTION 'Migration failed: v_identifiers_with_type view was not created';
    END IF;

    RAISE NOTICE 'Migration 039_drop_redundant_registry_tables completed successfully';
    RAISE NOTICE 'Dropped: company_registries table, company_identifiers_with_registry view';
    RAISE NOTICE 'Created: v_identifiers_with_type view (replacement)';
END $$;

-- Show the new view structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'v_identifiers_with_type'
ORDER BY ordinal_position;
