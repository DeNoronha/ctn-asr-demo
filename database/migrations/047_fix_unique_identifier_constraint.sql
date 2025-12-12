-- Migration 047: Fix unique identifier constraint to exclude soft-deleted records
-- Date: 2025-12-12
-- Issue: uq_identifier constraint was preventing updates when a soft-deleted record
--        with the same identifier value existed

-- Drop the existing unique constraint
ALTER TABLE legal_entity_number DROP CONSTRAINT IF EXISTS uq_identifier;

-- Create a partial unique index that only applies to non-deleted records
CREATE UNIQUE INDEX uq_identifier_active 
ON legal_entity_number (legal_entity_id, identifier_type, identifier_value)
WHERE is_deleted = false;

-- Add comment explaining the constraint
COMMENT ON INDEX uq_identifier_active IS 'Unique constraint on identifiers - only applies to active (non-deleted) records';
