-- Migration 028: Fix members_view to use legal_entity_id instead of org_id
-- Date: 2025-11-20
-- Purpose: Eliminate confusing org_id field name and use legal_entity_id consistently

-- Drop and recreate the view with correct field name
DROP VIEW IF EXISTS members_view;

CREATE OR REPLACE VIEW members_view AS
SELECT
    le.legal_entity_id,  -- Use legal_entity_id directly, not aliased as org_id
    le.primary_legal_name AS legal_name,
    MAX(CASE WHEN len.identifier_type = 'LEI' THEN len.identifier_value ELSE NULL END) AS lei,
    MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value ELSE NULL END) AS kvk,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created AS created_at,
    le.metadata
FROM legal_entity le
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
WHERE le.is_deleted = false
GROUP BY
    le.legal_entity_id,
    le.primary_legal_name,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created,
    le.metadata;

-- Add comment explaining the change
COMMENT ON VIEW members_view IS 'Members list view - returns legal_entity_id (not org_id) for consistency with rest of API';
