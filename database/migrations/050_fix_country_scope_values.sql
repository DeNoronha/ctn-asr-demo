-- Migration: 050_fix_country_scope_values.sql
-- Date: 2025-12-14
-- Description: Fix country_scope values for all identifier types
--              - EUID, EORI, PEPPOL → 'EU' (European Union scope)
--              - VAT, VIES → 'EU' (European Union VAT system)
--              - LEI, DUNS → 'GLOBAL' (worldwide identifiers)
--              - Country-specific remain with 2-letter country codes

-- First, drop view that depends on country_scope column
DROP VIEW IF EXISTS vw_identifiers_with_type;

-- Expand country_scope column to accommodate 'EU' and 'GLOBAL' (was VARCHAR(2))
ALTER TABLE legal_entity_number_type ALTER COLUMN country_scope TYPE VARCHAR(10);

-- Recreate the view with expanded column
CREATE OR REPLACE VIEW vw_identifiers_with_type AS
SELECT len.legal_entity_reference_id,
     len.legal_entity_id,
     len.identifier_type,
     len.identifier_value,
     len.country_code,
     len.validation_status,
     len.validation_date,
     len.registry_name,
     len.registry_url,
     len.is_deleted,
     lent.type_name,
     lent.description AS type_description,
     lent.country_scope,
     lent.format_regex,
     lent.format_example,
     lent.registry_url AS type_registry_url,
     lent.is_active AS type_is_active
FROM legal_entity_number len
LEFT JOIN legal_entity_number_type lent ON len.identifier_type::text = lent.type_code::text
WHERE len.is_deleted = false OR len.is_deleted IS NULL;

-- Add a comment explaining the country_scope field
COMMENT ON COLUMN legal_entity_number_type.country_scope IS
    'Geographic scope: 2-letter country code (NL, DE, BE, FR), EU for European Union identifiers, or GLOBAL for worldwide identifiers';

-- Update EU-wide identifiers to have 'EU' scope
UPDATE legal_entity_number_type
SET country_scope = 'EU', dt_modified = NOW()
WHERE type_code IN ('EUID', 'EORI', 'PEPPOL')
  AND (country_scope IS NULL OR country_scope = '');

-- Update VAT and VIES to have 'EU' scope (EU VAT system)
UPDATE legal_entity_number_type
SET country_scope = 'EU', dt_modified = NOW()
WHERE type_code IN ('VAT', 'VIES')
  AND (country_scope IS NULL OR country_scope = '');

-- Update global identifiers to have 'GLOBAL' scope
UPDATE legal_entity_number_type
SET country_scope = 'GLOBAL', dt_modified = NOW()
WHERE type_code IN ('LEI', 'DUNS')
  AND (country_scope IS NULL OR country_scope = '');

-- Add DUNS if it doesn't exist (common global business identifier)
INSERT INTO legal_entity_number_type (
    type_code, type_name, description, country_scope,
    format_regex, format_example, registry_url, display_order
) VALUES (
    'DUNS',
    'D-U-N-S Number',
    'Dun & Bradstreet unique 9-digit business identifier - used globally',
    'GLOBAL',
    '^\d{9}$',
    '123456789',
    'https://www.dnb.com',
    36  -- After LEI (35)
)
ON CONFLICT (type_code) DO UPDATE SET
    country_scope = 'GLOBAL',
    description = EXCLUDED.description,
    registry_url = EXCLUDED.registry_url,
    dt_modified = NOW();

-- Add PEPPOL if it doesn't exist
INSERT INTO legal_entity_number_type (
    type_code, type_name, description, country_scope,
    format_regex, format_example, registry_url, display_order
) VALUES (
    'PEPPOL',
    'Peppol Participant ID',
    'Pan-European Public Procurement Online - standardized e-invoicing identifier',
    'EU',
    '^[0-9]{4}:[A-Z0-9]+$',
    '0106:NL12345678',
    'https://directory.peppol.eu',
    32  -- After VIES (31)
)
ON CONFLICT (type_code) DO UPDATE SET
    country_scope = 'EU',
    description = EXCLUDED.description,
    registry_url = EXCLUDED.registry_url,
    dt_modified = NOW();

-- Verify the results
-- SELECT type_code, type_name, country_scope FROM legal_entity_number_type ORDER BY display_order;
