-- Migration: 034_expand_kvk_registry_data.sql
-- Description: Add missing KVK API fields to kvk_registry_data table
-- Based on KVK Basisprofiel API v1.4.0 OpenAPI specification
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- PART 1: Add missing fields from Basisprofiel response
-- ============================================================================

-- indNonMailing: Indicates if company wants no unsolicited mail/door sales
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS ind_non_mailing VARCHAR(10);

COMMENT ON COLUMN kvk_registry_data.ind_non_mailing IS 'Indicates if company wants no unsolicited mail or door-to-door sales (Ja/Nee)';

-- statutaireNaam: Statutory name when statutes are registered
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS statutory_name VARCHAR(500);

COMMENT ON COLUMN kvk_registry_data.statutory_name IS 'The statutory name of the company when statutes are registered';

-- materieleRegistratie.datumEinde: End date of company operations
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS material_end_date DATE;

COMMENT ON COLUMN kvk_registry_data.material_end_date IS 'End date of company operations (materieleRegistratie.datumEinde)';

-- ============================================================================
-- PART 2: Add missing fields from Vestiging (Hoofdvestiging) response
-- ============================================================================

-- vestigingsnummer: 12-digit branch number
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS vestigingsnummer VARCHAR(12);

COMMENT ON COLUMN kvk_registry_data.vestigingsnummer IS 'Branch number: unique 12-digit identifier for the establishment';

-- rsin: Legal entity identification number (fetched from KVK API)
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS rsin VARCHAR(9);

COMMENT ON COLUMN kvk_registry_data.rsin IS 'Rechtspersonen Samenwerkingsverbanden Informatie Nummer - 9 digit legal entity ID';

-- indHoofdvestiging: Is this the main branch
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS ind_hoofdvestiging VARCHAR(10);

COMMENT ON COLUMN kvk_registry_data.ind_hoofdvestiging IS 'Indicates if this is the main branch (Ja/Nee)';

-- indCommercieleVestiging: Is this a commercial establishment
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS ind_commerciele_vestiging VARCHAR(10);

COMMENT ON COLUMN kvk_registry_data.ind_commerciele_vestiging IS 'Indicates if this is a commercial establishment (Ja/Nee)';

-- voltijdWerkzamePersonen: Full-time employees
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS fulltime_employees INTEGER;

COMMENT ON COLUMN kvk_registry_data.fulltime_employees IS 'Number of full-time employees (voltijdWerkzamePersonen)';

-- deeltijdWerkzamePersonen: Part-time employees
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS parttime_employees INTEGER;

COMMENT ON COLUMN kvk_registry_data.parttime_employees IS 'Number of part-time employees (deeltijdWerkzamePersonen)';

-- eersteHandelsnaam: Primary trade name
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS primary_trade_name VARCHAR(500);

COMMENT ON COLUMN kvk_registry_data.primary_trade_name IS 'Primary trade name (eersteHandelsnaam) - the main name the company trades under';

-- websites: Company websites
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS websites JSONB;

COMMENT ON COLUMN kvk_registry_data.websites IS 'Array of company website URLs from KVK registration';

-- ============================================================================
-- PART 3: Add missing fields from Eigenaar (Owner) response
-- ============================================================================

-- rechtsvorm: Short legal form
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS rechtsvorm VARCHAR(100);

COMMENT ON COLUMN kvk_registry_data.rechtsvorm IS 'Short legal form code (rechtsvorm) e.g., BV, NV, Stichting';

-- Note: uitgebreideRechtsvorm is already stored in legal_form column

-- eigenaar_adressen: Owner addresses (separate from hoofdvestiging addresses)
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS owner_addresses JSONB;

COMMENT ON COLUMN kvk_registry_data.owner_addresses IS 'Owner/legal entity addresses (separate from establishment addresses)';

-- eigenaar_websites: Owner websites
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS owner_websites JSONB;

COMMENT ON COLUMN kvk_registry_data.owner_websites IS 'Owner/legal entity website URLs';

-- ============================================================================
-- PART 4: Add GeoData fields (when geoData=true parameter is used)
-- ============================================================================

-- geo_data: BAG and GPS information for addresses
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS geo_data JSONB;

COMMENT ON COLUMN kvk_registry_data.geo_data IS 'Geographic data including GPS coordinates and BAG identifiers (when geoData=true)';

-- ============================================================================
-- PART 5: Add branch information fields
-- ============================================================================

-- total_branches: Total number of branches for this KVK number
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS total_branches INTEGER;

COMMENT ON COLUMN kvk_registry_data.total_branches IS 'Total number of branches (totaalAantalVestigingen) for this company';

-- commercial_branches: Number of commercial branches
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS commercial_branches INTEGER;

COMMENT ON COLUMN kvk_registry_data.commercial_branches IS 'Number of commercial branches (aantalCommercieleVestigingen)';

-- non_commercial_branches: Number of non-commercial branches
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS non_commercial_branches INTEGER;

COMMENT ON COLUMN kvk_registry_data.non_commercial_branches IS 'Number of non-commercial branches (aantalNietCommercieleVestigingen)';

-- ============================================================================
-- PART 6: Add API metadata fields
-- ============================================================================

-- api_version: Version of the KVK API used for this fetch
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS api_version VARCHAR(20);

COMMENT ON COLUMN kvk_registry_data.api_version IS 'KVK API version used when fetching this data (from api-version header)';

-- api_warning: Any deprecation warnings from the API
ALTER TABLE kvk_registry_data
ADD COLUMN IF NOT EXISTS api_warning TEXT;

COMMENT ON COLUMN kvk_registry_data.api_warning IS 'API deprecation or other warnings received during fetch';

-- ============================================================================
-- PART 7: Create index on RSIN for faster lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_kvk_registry_rsin ON kvk_registry_data(rsin) WHERE is_deleted = FALSE AND rsin IS NOT NULL;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'kvk_registry_data'
      AND table_schema = 'public';

    RAISE NOTICE 'kvk_registry_data table now has % columns', col_count;
    RAISE NOTICE 'Migration 034_expand_kvk_registry_data completed successfully';
END $$;

-- Show the updated table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'kvk_registry_data'
  AND table_schema = 'public'
ORDER BY ordinal_position;
