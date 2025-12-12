-- Migration: 035_add_rsin_peppol_identifier_types.sql
-- Description: Add RSIN and PEPPOL to allowed identifier_type values
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- Drop existing constraint and recreate with new identifier types
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS chk_identifier_type_valid;

-- Add updated constraint with RSIN and PEPPOL
ALTER TABLE legal_entity_number
ADD CONSTRAINT chk_identifier_type_valid CHECK (
    identifier_type IN (
        'KVK',      -- Dutch Chamber of Commerce number
        'LEI',      -- Legal Entity Identifier (global)
        'EORI',     -- Economic Operators Registration and Identification
        'VAT',      -- Value Added Tax number
        'DUNS',     -- Dun & Bradstreet number
        'EUID',     -- European Unique Identifier
        'HRB',      -- German Handelsregister B (corporations)
        'HRA',      -- German Handelsregister A (partnerships)
        'KBO',      -- Belgian Kruispuntbank van Ondernemingen
        'SIREN',    -- French business identifier (9 digits)
        'SIRET',    -- French establishment identifier (14 digits)
        'CRN',      -- UK Company Registration Number
        'RSIN',     -- Dutch Rechtspersonen en Samenwerkingsverbanden Informatie Nummer
        'PEPPOL',   -- Peppol participant identifier
        'OTHER'     -- Catch-all for other identifier types
    )
);

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 035_add_rsin_peppol_identifier_types completed successfully';
    RAISE NOTICE 'Added RSIN and PEPPOL to allowed identifier_type values';
END $$;

-- Show the updated constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'chk_identifier_type_valid';
