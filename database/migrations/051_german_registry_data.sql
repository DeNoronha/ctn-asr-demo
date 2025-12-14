-- Migration: 051_german_registry_data.sql
-- Date: 2025-12-14
-- Description: Create table to store German Handelsregister data
--              Similar to kvk_registry_data for Dutch companies

-- Create table for German commercial register data
CREATE TABLE IF NOT EXISTS german_registry_data (
    registry_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Core Handelsregister identifiers
    register_number VARCHAR(50) NOT NULL,           -- e.g., "HRB 116737"
    register_type VARCHAR(10) NOT NULL,              -- HRA, HRB, GnR, PR, VR
    register_court VARCHAR(100),                     -- e.g., "Hamburg"
    register_court_code VARCHAR(20),                 -- e.g., "K1101R" (court code for EUID)

    -- Generated EUID
    euid VARCHAR(100),                               -- e.g., "DEK1101R.HRB116737"

    -- Company information
    company_name VARCHAR(500) NOT NULL,
    legal_form VARCHAR(200),                         -- e.g., "GmbH", "AG", "KG"
    legal_form_long VARCHAR(500),                    -- Full legal form description

    -- Registration status
    company_status VARCHAR(100),                     -- "Active", "Dissolved", "In Liquidation"
    registration_date DATE,                          -- Initial registration date
    dissolution_date DATE,                           -- If dissolved

    -- Address information
    street VARCHAR(255),
    house_number VARCHAR(20),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Germany',
    full_address TEXT,                               -- Complete formatted address

    -- Business purpose
    business_purpose TEXT,                           -- Unternehmensgegenstand

    -- Capital information
    share_capital VARCHAR(100),                      -- e.g., "25.000,00 EUR"
    share_capital_currency VARCHAR(10) DEFAULT 'EUR',

    -- Representatives (Managing Directors, Board Members)
    representatives JSONB,                           -- Array of {name, role, birthDate, etc.}

    -- Shareholders/Owners (if available)
    shareholders JSONB,                              -- Array of {name, share, type}

    -- Branch information
    is_main_establishment BOOLEAN DEFAULT TRUE,
    branch_count INTEGER,

    -- Related identifiers found
    vat_number VARCHAR(50),                          -- German VAT: DE + 9 digits
    lei VARCHAR(20),                                 -- LEI if found

    -- Data source tracking
    data_source VARCHAR(50) DEFAULT 'handelsregister', -- handelsregister, opencorporates, northdata
    source_url TEXT,                                 -- URL to registry entry

    -- Full API/scrape response
    raw_response JSONB,

    -- Metadata
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,

    -- Audit fields
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_german_registry_legal_entity
    ON german_registry_data(legal_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_german_registry_register_number
    ON german_registry_data(register_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_german_registry_euid
    ON german_registry_data(euid) WHERE is_deleted = FALSE AND euid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_german_registry_company_name
    ON german_registry_data(company_name) WHERE is_deleted = FALSE;

-- Unique constraint: one active record per legal entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_german_registry_unique_active
    ON german_registry_data(legal_entity_id) WHERE is_deleted = FALSE;

-- Add trigger to update dt_modified
CREATE OR REPLACE FUNCTION update_german_registry_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_german_registry_modified ON german_registry_data;
CREATE TRIGGER trigger_german_registry_modified
    BEFORE UPDATE ON german_registry_data
    FOR EACH ROW
    EXECUTE FUNCTION update_german_registry_modified();

-- Add comments
COMMENT ON TABLE german_registry_data IS 'Stores German Handelsregister (commercial register) data fetched from various sources';
COMMENT ON COLUMN german_registry_data.register_number IS 'Full register number including type, e.g., HRB 116737';
COMMENT ON COLUMN german_registry_data.register_type IS 'Register type: HRA (Einzelkaufleute/Personengesellschaften), HRB (Kapitalgesellschaften), GnR (Genossenschaften), PR (Partnerschaftsregister), VR (Vereinsregister)';
COMMENT ON COLUMN german_registry_data.register_court_code IS 'Court code used in EUID format, e.g., K1101R for Hamburg';
COMMENT ON COLUMN german_registry_data.euid IS 'European Unique Identifier in format DE{CourtCode}.{RegisterType}{Number}';

-- German court codes lookup table for EUID generation
CREATE TABLE IF NOT EXISTS german_court_codes (
    court_code_id SERIAL PRIMARY KEY,
    court_name VARCHAR(100) NOT NULL,               -- e.g., "Hamburg"
    court_code VARCHAR(20) NOT NULL UNIQUE,         -- e.g., "K1101R"
    state VARCHAR(50),                              -- Bundesland
    is_active BOOLEAN DEFAULT TRUE,
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common German court codes (subset - full list has 150+ courts)
INSERT INTO german_court_codes (court_name, court_code, state) VALUES
    ('Hamburg', 'K1101R', 'Hamburg'),
    ('Berlin (Charlottenburg)', 'D2201R', 'Berlin'),
    ('München', 'R3101R', 'Bayern'),
    ('Frankfurt am Main', 'C3101R', 'Hessen'),
    ('Düsseldorf', 'D4101R', 'Nordrhein-Westfalen'),
    ('Köln', 'D4401R', 'Nordrhein-Westfalen'),
    ('Stuttgart', 'S2101R', 'Baden-Württemberg'),
    ('Mannheim', 'S2501R', 'Baden-Württemberg'),
    ('Nürnberg', 'R2201R', 'Bayern'),
    ('Dresden', 'F1103R', 'Sachsen'),
    ('Leipzig', 'F1201R', 'Sachsen'),
    ('Hannover', 'D2901R', 'Niedersachsen'),
    ('Bremen', 'D1202R', 'Bremen'),
    ('Essen', 'D4201R', 'Nordrhein-Westfalen'),
    ('Dortmund', 'D4301R', 'Nordrhein-Westfalen'),
    ('Duisburg', 'D4101R', 'Nordrhein-Westfalen'),
    ('Bonn', 'D4501R', 'Nordrhein-Westfalen'),
    ('Wiesbaden', 'C3201R', 'Hessen'),
    ('Mainz', 'B3103R', 'Rheinland-Pfalz'),
    ('Saarbrücken', 'B4101R', 'Saarland'),
    ('Kiel', 'D1101R', 'Schleswig-Holstein'),
    ('Lübeck', 'D1301R', 'Schleswig-Holstein'),
    ('Rostock', 'E1103R', 'Mecklenburg-Vorpommern'),
    ('Schwerin', 'E1201R', 'Mecklenburg-Vorpommern'),
    ('Magdeburg', 'F1301R', 'Sachsen-Anhalt'),
    ('Erfurt', 'F2103R', 'Thüringen'),
    ('Potsdam', 'E2201R', 'Brandenburg')
ON CONFLICT (court_code) DO NOTHING;

COMMENT ON TABLE german_court_codes IS 'Lookup table for German court codes used in EUID generation';

-- Add HRB/HRA to legal_entity_number_type if not exists
INSERT INTO legal_entity_number_type (
    type_code, type_name, description, country_scope,
    format_regex, format_example, registry_url, display_order
) VALUES
    ('HRB', 'Handelsregister B', 'German commercial register for corporations (GmbH, AG, etc.)', 'DE',
     '^HRB\s*\d+.*$', 'HRB 116737', 'https://www.handelsregister.de', 20),
    ('HRA', 'Handelsregister A', 'German commercial register for sole proprietors and partnerships', 'DE',
     '^HRA\s*\d+.*$', 'HRA 12345', 'https://www.handelsregister.de', 21)
ON CONFLICT (type_code) DO UPDATE SET
    description = EXCLUDED.description,
    country_scope = EXCLUDED.country_scope,
    registry_url = EXCLUDED.registry_url,
    dt_modified = NOW();

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 051_german_registry_data completed successfully';
END $$;
