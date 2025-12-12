-- Migration: 036_create_identifier_type_lookup.sql
-- Description: Create lookup table for identifier types instead of CHECK constraint
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- PART 1: Create lookup table for identifier types
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_entity_number_type (
    type_code VARCHAR(20) PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    country_scope VARCHAR(2),  -- NULL = global, 'NL' = Netherlands only, etc.
    format_regex VARCHAR(255),  -- Optional regex for validation
    format_example VARCHAR(100),
    registry_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER DEFAULT 100,
    dt_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    dt_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    modified_by VARCHAR(255)
);

COMMENT ON TABLE legal_entity_number_type IS 'Lookup table for legal entity identifier types (KVK, LEI, VAT, etc.)';
COMMENT ON COLUMN legal_entity_number_type.type_code IS 'Unique identifier type code (e.g., KVK, LEI, RSIN)';
COMMENT ON COLUMN legal_entity_number_type.country_scope IS 'Country restriction (NULL = global, country code = country-specific)';
COMMENT ON COLUMN legal_entity_number_type.format_regex IS 'Optional regex pattern for format validation';

-- ============================================================================
-- PART 2: Insert all identifier types
-- ============================================================================

INSERT INTO legal_entity_number_type (type_code, type_name, description, country_scope, format_regex, format_example, registry_url, display_order) VALUES
-- Dutch identifiers
('KVK', 'Kamer van Koophandel', 'Dutch Chamber of Commerce registration number', 'NL', '^\d{8}$', '12345678', 'https://www.kvk.nl', 10),
('RSIN', 'RSIN', 'Rechtspersonen en Samenwerkingsverbanden Informatie Nummer - Dutch legal entity ID with 11-proof check digit', 'NL', '^\d{9}$', '001671248', 'https://www.kvk.nl', 15),

-- European identifiers
('EUID', 'European Unique Identifier', 'Standardized company identification across EU business registers (BRIS)', NULL, '^[A-Z]{2}\.[A-Z0-9.]+$', 'NL.KVK.12345678', 'https://e-justice.europa.eu/489/EN/business_registers', 20),
('EORI', 'EORI', 'Economic Operators Registration and Identification - EU customs identifier', NULL, '^[A-Z]{2}[A-Z0-9]{1,15}$', 'NL001671248', 'https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp', 25),
('VAT', 'VAT Number', 'Value Added Tax registration number', NULL, '^[A-Z]{2}[A-Z0-9]+$', 'NL001671248B03', 'https://ec.europa.eu/taxation_customs/vies', 30),
('LEI', 'Legal Entity Identifier', 'Global 20-character identifier for financial entities', NULL, '^[A-Z0-9]{20}$', '529900T8BM49AURSDO55', 'https://www.gleif.org', 35),

-- German identifiers
('HRB', 'Handelsregister B', 'German commercial register for corporations (GmbH, AG)', 'DE', NULL, 'HRB 123456', 'https://www.handelsregister.de', 40),
('HRA', 'Handelsregister A', 'German commercial register for partnerships (OHG, KG)', 'DE', NULL, 'HRA 123456', 'https://www.handelsregister.de', 41),

-- Belgian identifiers
('KBO', 'Kruispuntbank van Ondernemingen', 'Belgian Crossroads Bank for Enterprises - 10 digit number', 'BE', '^\d{10}$', '0123456789', 'https://kbopub.economie.fgov.be', 50),

-- French identifiers
('SIREN', 'SIREN', 'French business identifier - 9 digits', 'FR', '^\d{9}$', '123456789', 'https://www.sirene.fr', 60),
('SIRET', 'SIRET', 'French establishment identifier - 14 digits (SIREN + NIC)', 'FR', '^\d{14}$', '12345678901234', 'https://www.sirene.fr', 61),

-- UK identifiers
('CRN', 'Company Registration Number', 'UK Companies House registration number', 'GB', '^[A-Z0-9]{8}$', '12345678', 'https://www.gov.uk/government/organisations/companies-house', 70),

-- Global identifiers
('DUNS', 'D-U-N-S Number', 'Dun & Bradstreet unique 9-digit business identifier', NULL, '^\d{9}$', '123456789', 'https://www.dnb.com', 80),
('PEPPOL', 'Peppol Participant ID', 'Peppol network participant identifier', NULL, '^\d{4}:[a-zA-Z0-9]+$', '9944:nl001671248b03', 'https://directory.peppol.eu', 85),

-- Catch-all
('OTHER', 'Other Identifier', 'Other identifier types not in standard list', NULL, NULL, NULL, NULL, 999)

ON CONFLICT (type_code) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    description = EXCLUDED.description,
    country_scope = EXCLUDED.country_scope,
    format_regex = EXCLUDED.format_regex,
    format_example = EXCLUDED.format_example,
    registry_url = EXCLUDED.registry_url,
    display_order = EXCLUDED.display_order,
    dt_modified = NOW();

-- ============================================================================
-- PART 3: Add foreign key constraint to legal_entity_number
-- ============================================================================

-- First, drop the existing CHECK constraint
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS chk_identifier_type_valid;

-- Add foreign key constraint referencing the lookup table
ALTER TABLE legal_entity_number
ADD CONSTRAINT fk_identifier_type
FOREIGN KEY (identifier_type) REFERENCES legal_entity_number_type(type_code);

-- ============================================================================
-- PART 4: Create index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_identifier_type_active
ON legal_entity_number_type(type_code)
WHERE is_active = TRUE;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
DECLARE
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO type_count FROM legal_entity_number_type;
    RAISE NOTICE 'Migration 036_create_identifier_type_lookup completed successfully';
    RAISE NOTICE 'Created legal_entity_number_type lookup table with % identifier types', type_count;
END $$;

-- Show all identifier types
SELECT type_code, type_name, country_scope, format_example, display_order
FROM legal_entity_number_type
WHERE is_active = TRUE
ORDER BY display_order;
