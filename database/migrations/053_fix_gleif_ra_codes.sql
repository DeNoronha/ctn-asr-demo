-- Migration: 053_fix_gleif_ra_codes
-- Description: Fix GLEIF RA codes across all tables
-- Date: 2024-12-17
-- Author: Claude Code
--
-- This migration:
-- 1. Updates legal_entity_number_type with missing gleif_ra_code values
-- 2. Fixes gleif_registry_data to use correct RA codes (RA000463 instead of NL-KVK)
-- 3. Fixes registered_as field to contain only the number (not authority/number format)

-- ============================================
-- 1. Update legal_entity_number_type with GLEIF RA codes
-- ============================================

-- HRB/HRA - Germany has many RA codes, but we can link to the most common ones
-- Note: Germany has ~100 local court RA codes, so we don't set a single one
-- The actual RA code comes from the GLEIF response

-- SIRET is a subset of SIREN, use same RA
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000192' WHERE type_code = 'SIRET' AND gleif_ra_code IS NULL;

-- RSIN is Dutch, but it's a tax identifier not a commercial register number
-- It's used for legal entities but not linked to KvK directly
-- We leave it NULL as it's not a GLEIF registration authority

-- EUID/EORI/VAT/VIES are not commercial register numbers, they don't have RA codes
-- LEI is the identifier itself, not a source register
-- DUNS is a private database, not a government register
-- PEPPOL is a network ID, not a government register

-- ============================================
-- 2. Fix gleif_registry_data - convert old format to new
-- ============================================

-- Update registration_authority_id from "NL-KVK" format to "RA000463" format
UPDATE gleif_registry_data
SET registration_authority_id = 'RA000463'
WHERE registration_authority_id = 'NL-KVK';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000025'
WHERE registration_authority_id = 'BE-BCE';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000192'
WHERE registration_authority_id = 'FR-RCS';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000585'
WHERE registration_authority_id IN ('GB-COH', 'GB-CRO');

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000407'
WHERE registration_authority_id = 'IT-REA';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000533'
WHERE registration_authority_id = 'ES-CIF';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000017'
WHERE registration_authority_id = 'AT-FB';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000170'
WHERE registration_authority_id = 'DK-CVR';

UPDATE gleif_registry_data
SET registration_authority_id = 'RA000549'
WHERE registration_authority_id IN ('CH-EHRA', 'CH-CHRB');

-- Fix registered_as field - extract just the number from "NL-KVK/12345678" format
UPDATE gleif_registry_data
SET registered_as = SUBSTRING(registered_as FROM '/(.+)$')
WHERE registered_as LIKE '%/%';

-- ============================================
-- 3. Add foreign key constraint (optional, commented out for flexibility)
-- ============================================
-- The gleif_registry_data.registration_authority_id could reference gleif_registration_authorities.ra_code
-- But we don't enforce this since GLEIF may return RA codes we haven't imported yet

-- ALTER TABLE gleif_registry_data
-- ADD CONSTRAINT fk_gleif_registry_ra_code
-- FOREIGN KEY (registration_authority_id)
-- REFERENCES gleif_registration_authorities(ra_code);

-- ============================================
-- 4. Verify the fixes
-- ============================================

-- Show updated records
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM gleif_registry_data WHERE registration_authority_id LIKE 'RA%';
    RAISE NOTICE 'Records with correct RA format: %', v_count;

    SELECT COUNT(*) INTO v_count FROM gleif_registry_data WHERE registered_as NOT LIKE '%/%';
    RAISE NOTICE 'Records with correct registered_as format: %', v_count;
END $$;
