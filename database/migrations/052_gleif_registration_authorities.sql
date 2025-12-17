-- Migration: 052_gleif_registration_authorities
-- Description: Create table for GLEIF Registration Authority codes
-- Date: 2024-12-17
-- Author: Claude Code
--
-- The GLEIF Registration Authorities List contains 1,050+ business registers
-- from 232 jurisdictions. Each register has a unique RA code (e.g., RA000463 for KvK).
--
-- Source: https://www.gleif.org/en/about-lei/code-lists/gleif-registration-authorities-list

-- Create the table
CREATE TABLE IF NOT EXISTS gleif_registration_authorities (
    ra_code VARCHAR(20) PRIMARY KEY,                    -- e.g., 'RA000463'
    country_code VARCHAR(2) NOT NULL,                   -- ISO 3166-1 alpha-2, e.g., 'NL'
    country_name VARCHAR(100) NOT NULL,                 -- e.g., 'Netherlands'
    jurisdiction VARCHAR(100),                          -- Sub-jurisdiction if applicable, e.g., 'England and Wales'
    register_name_intl VARCHAR(255) NOT NULL,           -- International name, e.g., 'Business Register'
    register_name_local VARCHAR(255),                   -- Local name, e.g., 'Handelsregister'
    org_name_intl VARCHAR(255),                         -- Org responsible (intl), e.g., 'Netherlands Chamber of Commerce'
    org_name_local VARCHAR(255),                        -- Org responsible (local), e.g., 'Kamer van Koophandel'
    website VARCHAR(500),                               -- Registry website URL
    comments TEXT,                                      -- Additional notes
    is_primary BOOLEAN DEFAULT false,                   -- Is this the primary register for the country?
    is_active BOOLEAN DEFAULT true NOT NULL,
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add comments
COMMENT ON TABLE gleif_registration_authorities IS 'GLEIF Registration Authorities List - official business register codes from GLEIF';
COMMENT ON COLUMN gleif_registration_authorities.ra_code IS 'Unique GLEIF Registration Authority code (e.g., RA000463)';
COMMENT ON COLUMN gleif_registration_authorities.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN gleif_registration_authorities.is_primary IS 'Whether this is the primary commercial register for the country';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gleif_ra_country_code ON gleif_registration_authorities(country_code);
CREATE INDEX IF NOT EXISTS idx_gleif_ra_active ON gleif_registration_authorities(is_active) WHERE is_active = true;

-- Insert primary European business registers (the ones we actively use)
-- Full list available at: https://www.gleif.org/en/about-lei/code-lists/gleif-registration-authorities-list

INSERT INTO gleif_registration_authorities (ra_code, country_code, country_name, jurisdiction, register_name_intl, register_name_local, org_name_intl, org_name_local, website, is_primary)
VALUES
    -- Netherlands
    ('RA000463', 'NL', 'Netherlands', NULL, 'Business Register', 'Handelsregister', 'The Netherlands Chamber of Commerce', 'Kamer van Koophandel', 'www.kvk.nl/english', true),
    ('RA000464', 'NL', 'Netherlands', NULL, 'Financial Markets Authority Register', NULL, 'The Netherlands Authority for the Financial Markets', 'Autoriteit Financiële Markten', 'https://www.afm.nl/en/professionals/registers', false),

    -- Belgium
    ('RA000025', 'BE', 'Belgium', NULL, 'Crossroad Bank of Enterprises', 'Kruispuntbank van Ondernemingen', 'Federal Public Service Economy (Ministry of Economy)', 'Federale Overheidsdienst Economie', 'http://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?lang=en', true),

    -- Germany (selected major courts - Germany has ~100 local court registers)
    ('RA000217', 'DE', 'Germany', 'Berlin-Charlottenburg', 'Commercial Register', 'Handelsregister', 'Local Court Berlin-Charlottenburg', 'Amtsgericht Berlin-Charlottenburg', 'www.handelsregister.de', false),
    ('RA000222', 'DE', 'Germany', 'Bremen', 'Commercial Register', 'Handelsregister', 'Local Court Bremen', 'Amtsgericht Bremen', 'www.handelsregister.de', false),
    ('RA000234', 'DE', 'Germany', 'Düsseldorf', 'Commercial Register', 'Handelsregister', 'Local Court Düsseldorf', 'Amtsgericht Düsseldorf', 'www.handelsregister.de', false),
    ('RA000242', 'DE', 'Germany', 'Frankfurt am Main', 'Commercial Register', 'Handelsregister', 'Local Court Frankfurt am Main', 'Amtsgericht Frankfurt am Main', 'www.handelsregister.de', false),
    ('RA000254', 'DE', 'Germany', 'Hamburg', 'Commercial Register', 'Handelsregister', 'Local Court Hamburg', 'Amtsgericht Hamburg', 'www.handelsregister.de', true),
    ('RA000260', 'DE', 'Germany', 'Köln', 'Commercial Register', 'Handelsregister', 'Local Court Köln', 'Amtsgericht Köln', 'www.handelsregister.de', false),
    ('RA000267', 'DE', 'Germany', 'München', 'Commercial Register', 'Handelsregister', 'Local Court München', 'Amtsgericht München', 'www.handelsregister.de', false),
    ('RA000279', 'DE', 'Germany', 'Stuttgart', 'Commercial Register', 'Handelsregister', 'Local Court Stuttgart', 'Amtsgericht Stuttgart', 'www.handelsregister.de', false),

    -- France
    ('RA000189', 'FR', 'France', NULL, 'Register of Companies (Sirene)', 'Sirene', 'National Institute of Statistics and Economic Studies', 'Institut National de la Statistique et des Études Économiques', 'http://sirene.fr/sirene/public/accueil?sirene_locale=en', false),
    ('RA000192', 'FR', 'France', NULL, 'Register of Commerce and Companies', 'Registre du Commerce et des Sociétés', 'Infogreffe', 'Infogreffe', 'www.infogreffe.com', true),

    -- United Kingdom
    ('RA000585', 'GB', 'United Kingdom of Great Britain and Northern Ireland', 'England and Wales', 'Companies Register', 'Companies Register', 'Companies House', 'Companies House', 'www.companieshouse.gov.uk', true),
    ('RA000586', 'GB', 'United Kingdom of Great Britain and Northern Ireland', 'Northern Ireland', 'Companies Register', 'Companies Register', 'Companies House', 'Companies House', 'www.companieshouse.gov.uk', false),
    ('RA000587', 'GB', 'United Kingdom of Great Britain and Northern Ireland', 'Scotland', 'Companies Register', 'Companies Register', 'Companies House', 'Companies House', 'www.companieshouse.gov.uk', false),

    -- Italy
    ('RA000407', 'IT', 'Italy', NULL, 'Business Register', 'Registro Delle Imprese', 'Infocamere', 'Infocamere', 'www.registroimprese.it', true),

    -- Spain
    ('RA000533', 'ES', 'Spain', NULL, 'Commercial Registry', 'Registro Mercantil', 'Registrars of Spain', 'Registradores de España', 'www.registradores.org', true),
    ('RA000780', 'ES', 'Spain', NULL, 'Central Mercantile Registry', 'Registro Mercantil Central', 'Central Mercantile Registry', 'Registro Mercantil Central', 'http://www.rmc.es/Home.aspx', false),

    -- Portugal
    ('RA000487', 'PT', 'Portugal', NULL, 'Commercial Register', 'Registo Comercial', 'Institute of Registries and Notary (Ministry of Justice)', 'Instituto dos Registos e do Notariado', 'http://www.irn.mj.pt/IRN/sections/inicio', true),

    -- Luxembourg
    ('RA000432', 'LU', 'Luxembourg', NULL, 'Trade and Company Register', 'Registre de Commerce et des Sociétés', 'Luxembourg Business Registers', 'Luxembourg Business Registers', 'www.lbr.lu', true),

    -- Austria
    ('RA000017', 'AT', 'Austria', NULL, 'Commercial Register', 'Firmenbuch', 'Federal Ministry of Justice', 'Bundesministerium für Justiz', 'https://www.justiz.gv.at/', true),

    -- Denmark
    ('RA000170', 'DK', 'Denmark', NULL, 'Central Business Register', 'Centrale Virksomhedsregister', 'Danish Business Authority', 'Erhvervsstyrelsen', 'https://danishbusinessauthority.dk/', true),

    -- Sweden
    ('RA000544', 'SE', 'Sweden', NULL, 'Companies Register', NULL, 'Swedish Companies Registration Office', 'Bolagsverket', 'www.bolagsverket.se', true),

    -- Norway
    ('RA000472', 'NO', 'Norway', NULL, 'The Register of Business Enterprises', 'Foretaksregisteret', 'The Brønnøysund Register Centre', NULL, 'https://www.brreg.no/', true),
    ('RA000473', 'NO', 'Norway', NULL, 'The Central Coordinating Register for Legal Entities', 'Enhetsregisteret', 'The Brønnøysund Register Centre', NULL, 'https://www.brreg.no/', false),

    -- Finland
    ('RA000188', 'FI', 'Finland', NULL, 'The Business Information System (BIS)', 'Yritys- ja yhteisötietojärjestelmä (YTJ)', 'Finnish Patent and Registration Office', 'Patentti- ja Rekisterihallitus', 'http://www.prh.fi/en/kaupparekisteri.html', true),

    -- Ireland
    ('RA000402', 'IE', 'Ireland', NULL, 'Companies Register', 'Companies Register', 'Companies Registration Office', 'Companies Registration Office', 'http://www.cro.ie/', true),

    -- Poland
    ('RA000484', 'PL', 'Poland', NULL, 'National Court Register', 'Krajowy Rejestr Sądowy (KRS)', 'Ministry of Justice', 'Minsterstwo Sprawiedliwosci', 'https://ekrs.ms.gov.pl/', true),

    -- Czech Republic
    ('RA000163', 'CZ', 'Czechia', NULL, 'Commercial Register', 'Obchodní rejstřík', 'Ministry of Justice', 'Ministerstvo spravedlnosti', 'https://or.justice.cz/ias/ui/rejstrik', true),

    -- Switzerland
    ('RA000548', 'CH', 'Switzerland', NULL, 'UID-Register', 'UID-Register', 'Federal Statistical Office', 'Bundesamt für Statistik', 'https://www.uid.admin.ch/', false),
    ('RA000549', 'CH', 'Switzerland', NULL, 'Commercial Register', 'Handelsregister', 'Ministry of Justice', 'Bundesamt für Justiz', 'www.zefix.ch/', true)
ON CONFLICT (ra_code) DO UPDATE SET
    country_name = EXCLUDED.country_name,
    register_name_intl = EXCLUDED.register_name_intl,
    register_name_local = EXCLUDED.register_name_local,
    org_name_intl = EXCLUDED.org_name_intl,
    org_name_local = EXCLUDED.org_name_local,
    website = EXCLUDED.website,
    is_primary = EXCLUDED.is_primary,
    dt_modified = NOW();

-- Create a view to easily look up RA codes by country
CREATE OR REPLACE VIEW vw_gleif_ra_by_country AS
SELECT
    country_code,
    country_name,
    ARRAY_AGG(ra_code ORDER BY is_primary DESC, ra_code) as ra_codes,
    (SELECT ra_code FROM gleif_registration_authorities g2
     WHERE g2.country_code = g1.country_code AND g2.is_primary = true AND g2.is_active = true
     LIMIT 1) as primary_ra_code
FROM gleif_registration_authorities g1
WHERE is_active = true
GROUP BY country_code, country_name;

COMMENT ON VIEW vw_gleif_ra_by_country IS 'GLEIF Registration Authority codes grouped by country';

-- Add foreign key reference from legal_entity_number_type to this table (optional link)
ALTER TABLE legal_entity_number_type
ADD COLUMN IF NOT EXISTS gleif_ra_code VARCHAR(20) REFERENCES gleif_registration_authorities(ra_code);

COMMENT ON COLUMN legal_entity_number_type.gleif_ra_code IS 'Optional link to the GLEIF Registration Authority for this identifier type';

-- Update existing identifier types with their GLEIF RA codes
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000463' WHERE type_code = 'KVK';
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000025' WHERE type_code IN ('KBO', 'BCE');
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000585' WHERE type_code = 'CRN';
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000407' WHERE type_code = 'REA';
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000192' WHERE type_code IN ('RCS', 'SIREN');
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000017' WHERE type_code = 'FB';
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000170' WHERE type_code = 'CVR';
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000484' WHERE type_code = 'KRS';
UPDATE legal_entity_number_type SET gleif_ra_code = 'RA000549' WHERE type_code = 'CHR';
-- Note: HRB/HRA don't have a single RA code (Germany has ~100 local courts)
