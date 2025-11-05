-- Migration 021: Fix Applications Table FK Constraint
-- Purpose: Fix incorrect FK constraint reference from legal_entities to legal_entity
-- Date: 2025-11-05
-- Bug: Application approval failing with 500 error due to invalid FK constraint

-- ============================================================================
-- BACKGROUND
-- ============================================================================
-- Migration 016 incorrectly referenced 'legal_entities' (plural) table
-- The correct table name is 'legal_entity' (singular)
-- This causes INSERT operations to fail during application approval

-- ============================================================================
-- DROP INCORRECT CONSTRAINT (IF EXISTS)
-- ============================================================================

DO $$
BEGIN
    -- Check if the constraint exists before dropping
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'applications_created_member_id_fkey'
        AND table_name = 'applications'
    ) THEN
        ALTER TABLE applications
        DROP CONSTRAINT applications_created_member_id_fkey;
        RAISE NOTICE '✓ Dropped incorrect FK constraint: applications_created_member_id_fkey';
    ELSE
        RAISE NOTICE 'ℹ No FK constraint found - may not have been created due to invalid table reference';
    END IF;
END $$;

-- ============================================================================
-- CREATE CORRECT CONSTRAINT
-- ============================================================================

DO $$
BEGIN
    -- Add the correct FK constraint
    ALTER TABLE applications
    ADD CONSTRAINT applications_created_member_id_fkey
    FOREIGN KEY (created_member_id)
    REFERENCES legal_entity(legal_entity_id)
    ON DELETE SET NULL;

    RAISE NOTICE '✓ Created correct FK constraint: applications_created_member_id_fkey -> legal_entity(legal_entity_id)';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'ℹ FK constraint already exists with correct reference';
END $$;

-- ============================================================================
-- VERIFY CONSTRAINT
-- ============================================================================

DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'applications'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'legal_entity'
        AND tc.constraint_name = 'applications_created_member_id_fkey';

    IF constraint_count > 0 THEN
        RAISE NOTICE '✅ Migration 021 completed: FK constraint verified';
    ELSE
        RAISE EXCEPTION '❌ Migration 021 failed: FK constraint not found';
    END IF;
END $$;
