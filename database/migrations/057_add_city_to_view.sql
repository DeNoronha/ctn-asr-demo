-- Migration: 057_add_city_to_view
-- Description: Add city column to vw_legal_entities view
-- Date: 2024-12-17
-- Author: Claude Code
--
-- This migration adds the city column to the vw_legal_entities view
-- to support the redesigned Members datagrid

-- ============================================
-- Drop and recreate the view to add new column
-- ============================================

DROP VIEW IF EXISTS vw_legal_entities;

CREATE VIEW vw_legal_entities AS
SELECT
  le.legal_entity_id,
  le.party_id,
  le.primary_legal_name,
  le.city,
  le.country_code,
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
  -- Aggregations
  (SELECT COUNT(*) FROM legal_entity_contact lec
   WHERE lec.legal_entity_id = le.legal_entity_id AND lec.is_active = true) AS contact_count,
  (SELECT COUNT(*) FROM legal_entity_endpoint lee
   WHERE lee.legal_entity_id = le.legal_entity_id AND lee.is_active = true) AS endpoint_count
FROM legal_entity le
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
  AND len.is_deleted = false
WHERE le.is_deleted = false
GROUP BY le.legal_entity_id;

-- ============================================
-- Verify the change
-- ============================================

DO $$
DECLARE
  v_has_city BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vw_legal_entities' AND column_name = 'city'
  ) INTO v_has_city;

  IF v_has_city THEN
    RAISE NOTICE 'Successfully added city column to vw_legal_entities';
  ELSE
    RAISE EXCEPTION 'Failed to add city column to vw_legal_entities';
  END IF;
END $$;
