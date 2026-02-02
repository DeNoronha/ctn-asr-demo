-- Migration: 064_legal_entity_status_not_null.sql
-- Date: 2026-02-02
-- Description: Make legal_entity.status NOT NULL with default 'PENDING'
--
-- The status column was nullable which could cause issues with audit logging
-- and business logic. All new entities should start with 'PENDING' status.

BEGIN;

-- First, update any NULL values to 'PENDING' (there shouldn't be any, but just in case)
UPDATE legal_entity
SET status = 'PENDING'
WHERE status IS NULL;

-- Now make the column NOT NULL
ALTER TABLE legal_entity
ALTER COLUMN status SET NOT NULL;

-- Verify the change
DO $$
DECLARE
    is_nullable TEXT;
BEGIN
    SELECT c.is_nullable INTO is_nullable
    FROM information_schema.columns c
    WHERE c.table_name = 'legal_entity' AND c.column_name = 'status';

    IF is_nullable = 'NO' THEN
        RAISE NOTICE 'SUCCESS: legal_entity.status is now NOT NULL';
    ELSE
        RAISE EXCEPTION 'FAILED: legal_entity.status is still nullable';
    END IF;
END $$;

COMMIT;
