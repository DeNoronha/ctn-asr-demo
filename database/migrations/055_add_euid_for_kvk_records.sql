-- Migration: 055_add_euid_for_kvk_records
-- Description: Add EUID identifier for all existing KVK records that don't have one
-- Date: 2024-12-17
-- Author: Claude Code
--
-- This migration:
-- 1. Finds all Dutch legal entities with KVK but no EUID
-- 2. Generates EUID in format NL.KVK.{kvk_number}
-- 3. Creates EUID identifier records

-- ============================================
-- Generate EUID for all KVK records without EUID
-- ============================================

INSERT INTO legal_entity_number (
  legal_entity_reference_id,
  legal_entity_id,
  identifier_type,
  identifier_value,
  country_code,
  validation_status,
  registry_name,
  registry_url,
  verification_notes,
  dt_created,
  dt_modified
)
SELECT
  gen_random_uuid(),
  kvk.legal_entity_id,
  'EUID',
  'NL.KVK.' || kvk.identifier_value,
  'NL',
  'VALIDATED',
  'BRIS',
  'https://e-justice.europa.eu/489/EN/business_registers',
  'Auto-generated from KVK (migration 055)',
  NOW(),
  NOW()
FROM legal_entity_number kvk
WHERE kvk.identifier_type = 'KVK'
  AND kvk.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 FROM legal_entity_number euid
    WHERE euid.legal_entity_id = kvk.legal_entity_id
      AND euid.identifier_type = 'EUID'
      AND euid.is_deleted = false
  );

-- ============================================
-- Verify the migration
-- ============================================

DO $$
DECLARE
  v_kvk_count INTEGER;
  v_euid_count INTEGER;
  v_missing_count INTEGER;
BEGIN
  -- Count KVK records
  SELECT COUNT(*) INTO v_kvk_count
  FROM legal_entity_number
  WHERE identifier_type = 'KVK' AND is_deleted = false;

  -- Count EUID records
  SELECT COUNT(*) INTO v_euid_count
  FROM legal_entity_number
  WHERE identifier_type = 'EUID' AND is_deleted = false;

  -- Count KVK without EUID
  SELECT COUNT(*) INTO v_missing_count
  FROM legal_entity_number kvk
  WHERE kvk.identifier_type = 'KVK'
    AND kvk.is_deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM legal_entity_number euid
      WHERE euid.legal_entity_id = kvk.legal_entity_id
        AND euid.identifier_type = 'EUID'
        AND euid.is_deleted = false
    );

  RAISE NOTICE 'KVK records: %, EUID records: %, KVK without EUID: %',
    v_kvk_count, v_euid_count, v_missing_count;
END $$;
