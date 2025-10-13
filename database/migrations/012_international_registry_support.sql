-- ===========================================================================
-- Migration 012: International Chamber of Commerce Registry Support
-- ===========================================================================
-- Purpose: Add support for international company registrations (EUID, etc.)
--          and track which specific Chamber of Commerce issued the number
--
-- Context: Companies can be registered with different Chambers of Commerce:
--   - Netherlands: KvK (Kamer van Koophandel)
--   - Germany: IHK (Industrie- und Handelskammer) - multiple regional chambers
--   - Belgium: KBO/BCE (Kruispuntbank van Ondernemingen)
--   - France: SIREN/SIRET via CCI (Chambre de Commerce et d'Industrie)
--   - UK: Companies House
--   - EU-wide: EUID (European Unique Identifier)
--
-- Created: 2025-10-13
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Add registry_name column to legal_entity_number
-- Purpose: Store which specific chamber/registry issued the identifier
-- ---------------------------------------------------------------------------
ALTER TABLE legal_entity_number
ADD COLUMN IF NOT EXISTS registry_name VARCHAR(255);

COMMENT ON COLUMN legal_entity_number.registry_name IS 'Name of the issuing registry/chamber (e.g., "IHK Berlin", "KvK", "Companies House")';

-- Add registry_url column for verification
ALTER TABLE legal_entity_number
ADD COLUMN IF NOT EXISTS registry_url VARCHAR(500);

COMMENT ON COLUMN legal_entity_number.registry_url IS 'URL to the registry for verification purposes';

-- Add index on country_code for international queries
CREATE INDEX IF NOT EXISTS idx_legal_entity_number_country
ON legal_entity_number(country_code)
WHERE country_code IS NOT NULL;

-- Add composite index for type + country queries
CREATE INDEX IF NOT EXISTS idx_legal_entity_number_type_country
ON legal_entity_number(identifier_type, country_code)
WHERE country_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Reference Data: Common Identifier Types
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN legal_entity_number.identifier_type IS
'Type of identifier. Common values:
- KVK: Dutch Chamber of Commerce number
- EUID: European Unique Identifier (EU-wide)
- LEI: Legal Entity Identifier (global)
- EORI: Economic Operators Registration and Identification (EU customs)
- HRB: Handelsregister B (Germany - corporations)
- HRA: Handelsregister A (Germany - partnerships)
- KBO: Kruispuntbank van Ondernemingen (Belgium)
- BCE: Banque-Carrefour des Entreprises (Belgium, French)
- SIREN: Système d''Identification du Répertoire des Entreprises (France, 9 digits)
- SIRET: SIREN + établissement (France, 14 digits)
- CRN: Company Registration Number (UK)
- BRN: Business Registration Number (various countries)
- VAT: VAT identification number
- DUNS: Dun & Bradstreet number (global)';

-- ---------------------------------------------------------------------------
-- Create reference table for known registries
-- Purpose: Maintain a list of known Chambers of Commerce and registries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_registries (
    registry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Registry identification
    registry_code VARCHAR(50) NOT NULL UNIQUE,      -- e.g., "KVK", "IHK_BERLIN", "COMPANIES_HOUSE"
    registry_name VARCHAR(255) NOT NULL,             -- Full name
    country_code VARCHAR(2) NOT NULL,                -- ISO 3166-1 alpha-2

    -- Registry details
    registry_type VARCHAR(50),                       -- chamber_of_commerce, companies_registry, tax_authority
    jurisdiction VARCHAR(255),                       -- Region/state if applicable (e.g., "Berlin", "Noord-Holland")

    -- Contact/verification
    registry_url VARCHAR(500),                       -- Main website
    verification_url VARCHAR(500),                   -- URL pattern for verification (use {identifier} placeholder)
    api_endpoint VARCHAR(500),                       -- API endpoint if available

    -- Identifier format
    identifier_pattern VARCHAR(255),                 -- Regex pattern for validation
    identifier_example VARCHAR(100),                 -- Example identifier
    identifier_length_min INTEGER,
    identifier_length_max INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT true,
    supports_api_lookup BOOLEAN DEFAULT false,
    requires_authentication BOOLEAN DEFAULT false,

    -- Metadata
    notes TEXT,
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by VARCHAR(100),
    modified_by VARCHAR(100)
);

COMMENT ON TABLE company_registries IS 'Reference table of known Chambers of Commerce and company registries worldwide';
COMMENT ON COLUMN company_registries.verification_url IS 'URL pattern for verification, use {identifier} as placeholder (e.g., https://www.kvk.nl/en/search/?source={identifier})';

-- Create indexes
CREATE INDEX idx_registries_country ON company_registries(country_code);
CREATE INDEX idx_registries_type ON company_registries(registry_type);
CREATE INDEX idx_registries_active ON company_registries(is_active) WHERE is_active = true;

-- Create trigger for modified timestamp
CREATE TRIGGER trg_company_registries_modified
    BEFORE UPDATE ON company_registries
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

-- ---------------------------------------------------------------------------
-- Seed Data: Common European Registries
-- ---------------------------------------------------------------------------

-- Netherlands: KvK (Kamer van Koophandel)
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    identifier_length_min, identifier_length_max, supports_api_lookup, notes
) VALUES (
    'KVK',
    'Kamer van Koophandel (Dutch Chamber of Commerce)',
    'NL',
    'chamber_of_commerce',
    'Netherlands',
    'https://www.kvk.nl',
    'https://www.kvk.nl/en/search/?source={identifier}',
    '^\d{8}$',
    '17187159',
    8, 8,
    true,
    'Dutch KvK numbers are 8 digits. API available at https://developers.kvk.nl'
) ON CONFLICT (registry_code) DO NOTHING;

-- Germany: IHK (Industrie- und Handelskammer) - Multiple regional chambers
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    supports_api_lookup, notes
) VALUES
(
    'IHK_BERLIN',
    'IHK Berlin (Industrie- und Handelskammer zu Berlin)',
    'DE',
    'chamber_of_commerce',
    'Berlin',
    'https://www.ihk-berlin.de',
    'https://www.unternehmensregister.de/ureg/search1.2.html?submitaction=language&language=en',
    '^HRB\s?\d{1,6}(\s?[A-Z]{1,3})?$',
    'HRB 123456 B',
    false,
    'German Handelsregister B (HRB) for corporations (GmbH, AG, etc.)'
),
(
    'IHK_MUNICH',
    'IHK für München und Oberbayern',
    'DE',
    'chamber_of_commerce',
    'Munich',
    'https://www.ihk-muenchen.de',
    'https://www.unternehmensregister.de/ureg/search1.2.html?submitaction=language&language=en',
    '^HRB\s?\d{1,6}(\s?[A-Z]{1,3})?$',
    'HRB 123456 B',
    false,
    'Munich regional chamber'
),
(
    'HANDELSREGISTER_DE',
    'German Handelsregister (Commercial Register)',
    'DE',
    'companies_registry',
    'Germany',
    'https://www.unternehmensregister.de',
    'https://www.unternehmensregister.de/ureg/search1.2.html?submitaction=language&language=en',
    '^HR[AB]\s?\d{1,6}(\s?[A-Z]{1,3})?$',
    'HRB 123456',
    false,
    'Central German commercial register. HRA for partnerships, HRB for corporations'
)
ON CONFLICT (registry_code) DO NOTHING;

-- Belgium: KBO/BCE
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    identifier_length_min, identifier_length_max, supports_api_lookup, notes
) VALUES (
    'KBO',
    'Kruispuntbank van Ondernemingen (Belgian Crossroads Bank for Enterprises)',
    'BE',
    'companies_registry',
    'Belgium',
    'https://economie.fgov.be/nl/themas/ondernemingen/kruispuntbank-van',
    'https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer={identifier}',
    '^\d{10}$',
    '0123456789',
    10, 10,
    true,
    'Belgian enterprise number. Also known as BCE (Banque-Carrefour des Entreprises) in French'
) ON CONFLICT (registry_code) DO NOTHING;

-- France: SIREN/SIRET
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    identifier_length_min, identifier_length_max, supports_api_lookup, notes
) VALUES
(
    'SIREN',
    'SIREN - Système d''Identification du Répertoire des Entreprises',
    'FR',
    'companies_registry',
    'France',
    'https://www.insee.fr',
    'https://www.societe.com/cgi-bin/search?champs={identifier}',
    '^\d{9}$',
    '123456789',
    9, 9,
    true,
    'French 9-digit company identifier issued by INSEE'
),
(
    'SIRET',
    'SIRET - SIREN + établissement identifier',
    'FR',
    'companies_registry',
    'France',
    'https://www.insee.fr',
    'https://www.societe.com/cgi-bin/search?champs={identifier}',
    '^\d{14}$',
    '12345678901234',
    14, 14,
    true,
    'French 14-digit establishment identifier (SIREN + 5-digit NIC)'
)
ON CONFLICT (registry_code) DO NOTHING;

-- United Kingdom: Companies House
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    supports_api_lookup, notes
) VALUES (
    'COMPANIES_HOUSE',
    'Companies House (UK Registrar of Companies)',
    'GB',
    'companies_registry',
    'United Kingdom',
    'https://www.gov.uk/government/organisations/companies-house',
    'https://find-and-update.company-information.service.gov.uk/company/{identifier}',
    '^[A-Z0-9]{2}\d{6}$|^\d{8}$',
    '12345678 or SC123456',
    8, 8,
    true,
    'UK company registration number. API available at https://developer.company-information.service.gov.uk'
) ON CONFLICT (registry_code) DO NOTHING;

-- European Union: EUID (European Unique Identifier)
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    supports_api_lookup, notes
) VALUES (
    'EUID',
    'EUID - European Unique Identifier',
    'EU',
    'supranational_registry',
    'European Union',
    'https://e-justice.europa.eu',
    'https://e-justice.europa.eu/489/EN/company_data_in_the_business_registers_interconnection_system_bris',
    '^[A-Z]{2}[A-Z0-9]{1,20}$',
    'NL.12345678',
    2, 22,
    true,
    'EU-wide identifier format: country code + national identifier. Used in BRIS (Business Registers Interconnection System)'
) ON CONFLICT (registry_code) DO NOTHING;

-- Global: LEI (Legal Entity Identifier)
INSERT INTO company_registries (
    registry_code, registry_name, country_code, registry_type, jurisdiction,
    registry_url, verification_url, identifier_pattern, identifier_example,
    identifier_length_min, identifier_length_max, supports_api_lookup, notes
) VALUES (
    'LEI',
    'LEI - Legal Entity Identifier (Global LEI System)',
    'XX',
    'supranational_registry',
    'Global',
    'https://www.gleif.org',
    'https://search.gleif.org/#/record/{identifier}',
    '^[A-Z0-9]{20}$',
    '724500F1QBVV6D4V0T23',
    20, 20,
    true,
    'Global 20-character alphanumeric identifier. Managed by GLEIF. Used for financial and regulatory reporting'
) ON CONFLICT (registry_code) DO NOTHING;

-- ===========================================================================
-- Update existing records
-- ===========================================================================

-- Set registry_name for existing KVK identifiers
UPDATE legal_entity_number
SET
    registry_name = 'Kamer van Koophandel',
    registry_url = 'https://www.kvk.nl',
    country_code = 'NL'
WHERE identifier_type = 'KVK'
  AND registry_name IS NULL;

-- Set registry_name for existing LEI identifiers
UPDATE legal_entity_number
SET
    registry_name = 'Global LEI System',
    registry_url = 'https://www.gleif.org'
WHERE identifier_type = 'LEI'
  AND registry_name IS NULL;

-- ===========================================================================
-- Helper Views
-- ===========================================================================

-- View: company_identifiers_with_registry
-- Purpose: Join legal_entity_number with company_registries for full details
CREATE OR REPLACE VIEW company_identifiers_with_registry AS
SELECT
    len.legal_entity_reference_id,
    len.legal_entity_id,
    len.identifier_type,
    len.identifier_value,
    len.country_code,
    len.registry_name,
    len.registry_url as identifier_registry_url,
    len.validation_status,
    cr.registry_id,
    cr.registry_code,
    cr.registry_name as official_registry_name,
    cr.registry_type,
    cr.jurisdiction,
    cr.registry_url as official_registry_url,
    cr.verification_url,
    cr.supports_api_lookup,
    cr.identifier_pattern,
    cr.identifier_example
FROM legal_entity_number len
LEFT JOIN company_registries cr ON (
    len.identifier_type = cr.registry_code
    OR (len.country_code = cr.country_code AND cr.registry_type = 'chamber_of_commerce')
)
WHERE len.is_deleted = false OR len.is_deleted IS NULL;

COMMENT ON VIEW company_identifiers_with_registry IS 'Legal entity identifiers joined with registry reference data';

-- ===========================================================================
-- Migration Complete
-- ===========================================================================

SELECT 'Migration 012 completed successfully' AS status;
SELECT 'Added ' || count(*) || ' registry reference records' AS registries_created
FROM company_registries;
