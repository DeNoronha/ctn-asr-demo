-- Migration: 063_fix_euid_format.sql
-- Date: 2026-01-30
-- Description: Fix EUID format in existing records to match official BRIS format
-- 
-- Correct EUID Format: {CountryCode}{RegisterCode}.{Number}
-- - Netherlands: NLNHR.{kvk} (e.g., NLNHR.51096072) - NHR = Nationaal Handelsregister
-- - Germany: DE{court}.{type}{nr} (e.g., DEK1101R.HRB116737)
-- - Belgium: BEKBOBCE.{kbo} (e.g., BEKBOBCE.0656727414)
--
-- Source: EU Verordening 2021/1042
-- URL: https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu_en

BEGIN;

-- =====================================================
-- Show current EUID records before update
-- =====================================================

DO $$
DECLARE
    old_format_nl INTEGER;
    old_format_be INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_format_nl
    FROM legal_entity_number
    WHERE identifier_type = 'EUID'
      AND identifier_value LIKE 'NL.KVK.%'
      AND is_deleted = false;
    
    SELECT COUNT(*) INTO old_format_be
    FROM legal_entity_number
    WHERE identifier_type = 'EUID'
      AND identifier_value LIKE 'BE.KBO.%'
      AND is_deleted = false;
    
    RAISE NOTICE 'Found % Netherlands EUID records with old NL.KVK format', old_format_nl;
    RAISE NOTICE 'Found % Belgium EUID records with old BE.KBO format', old_format_be;
END $$;

-- =====================================================
-- Fix existing EUID records with old format
-- =====================================================

-- Update Netherlands EUIDs: NL.KVK.12345678 → NLNHR.12345678
UPDATE legal_entity_number
SET 
    identifier_value = 'NLNHR.' || SUBSTRING(identifier_value FROM 8), -- Extract number after 'NL.KVK.'
    verification_notes = COALESCE(verification_notes, '') || 
                         CASE WHEN verification_notes IS NOT NULL AND verification_notes != '' THEN ' | ' ELSE '' END ||
                         'Format corrected from NL.KVK to NLNHR (migration 063, ' || CURRENT_DATE::TEXT || ')',
    dt_modified = CURRENT_TIMESTAMP
WHERE identifier_type = 'EUID'
  AND identifier_value LIKE 'NL.KVK.%'
  AND is_deleted = false;

-- Update Belgium EUIDs: BE.KBO.xxx → BEKBOBCE.xxx (removing dots from KBO number)
UPDATE legal_entity_number
SET 
    identifier_value = 'BEKBOBCE.' || REPLACE(SUBSTRING(identifier_value FROM 8), '.', ''),
    verification_notes = COALESCE(verification_notes, '') || 
                         CASE WHEN verification_notes IS NOT NULL AND verification_notes != '' THEN ' | ' ELSE '' END ||
                         'Format corrected from BE.KBO to BEKBOBCE (migration 063, ' || CURRENT_DATE::TEXT || ')',
    dt_modified = CURRENT_TIMESTAMP
WHERE identifier_type = 'EUID'
  AND identifier_value LIKE 'BE.KBO.%'
  AND is_deleted = false;

-- =====================================================
-- Log completion and show updated records
-- =====================================================

DO $$
DECLARE
    updated_nl_count INTEGER;
    updated_be_count INTEGER;
BEGIN
    -- Count updated Netherlands records
    SELECT COUNT(*) INTO updated_nl_count
    FROM legal_entity_number
    WHERE identifier_type = 'EUID'
      AND identifier_value LIKE 'NLNHR.%'
      AND is_deleted = false;
    
    -- Count updated Belgium records
    SELECT COUNT(*) INTO updated_be_count
    FROM legal_entity_number
    WHERE identifier_type = 'EUID'
      AND identifier_value LIKE 'BEKBOBCE.%'
      AND is_deleted = false;
    
    RAISE NOTICE '---------------------------------------------';
    RAISE NOTICE 'Migration 063 completed:';
    RAISE NOTICE '  - Netherlands EUID records now in NLNHR format: %', updated_nl_count;
    RAISE NOTICE '  - Belgium EUID records now in BEKBOBCE format: %', updated_be_count;
    RAISE NOTICE '---------------------------------------------';
END $$;

COMMIT;
