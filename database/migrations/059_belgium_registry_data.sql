-- Migration: 059_belgium_registry_data.sql
-- Date: 2025-12-17
-- Description: Create table to store Belgian KBO (Kruispuntbank van Ondernemingen) data
--              Similar to german_registry_data for German companies

-- Create table for Belgian commercial register data
CREATE TABLE IF NOT EXISTS belgium_registry_data (
    registry_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Core KBO identifiers
    kbo_number VARCHAR(20) NOT NULL,                  -- e.g., "0439.291.125" (10 digits, formatted)
    kbo_number_clean VARCHAR(10) NOT NULL,            -- e.g., "0439291125" (10 digits, no dots)

    -- Enterprise type
    enterprise_type VARCHAR(50),                      -- "Rechtspersoon", "Natuurlijk persoon"
    enterprise_type_code VARCHAR(10),                 -- "2" = Rechtspersoon

    -- Company information
    company_name VARCHAR(500) NOT NULL,
    legal_form VARCHAR(200),                          -- e.g., "BV", "NV", "BVBA"
    legal_form_full VARCHAR(500),                     -- Full: "Besloten vennootschap"

    -- Status information
    company_status VARCHAR(100),                      -- "Actief", "Stopgezet", "Start"
    status_start_date DATE,                           -- When current status started
    start_date DATE,                                  -- Company foundation date
    end_date DATE,                                    -- If ceased

    -- Address information
    street VARCHAR(255),
    house_number VARCHAR(20),
    bus_number VARCHAR(20),                           -- Belgian "bus" (box/unit number)
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(50) DEFAULT 'Belgium',
    full_address TEXT,                                -- Complete formatted address

    -- VAT information
    vat_number VARCHAR(20),                           -- BE0439291125 (derived from KBO)
    vat_status VARCHAR(100),                          -- "BTW-plichtig sinds..."
    vat_start_date DATE,                              -- When VAT liability started

    -- Activities (NACE codes)
    nace_codes JSONB,                                 -- Array of {code, description, isMain}
    main_activity VARCHAR(500),                       -- Primary NACE activity description

    -- Management/Representatives
    representatives JSONB,                            -- Array of {name, role, startDate}

    -- Establishments
    establishment_count INTEGER,                      -- Number of business units
    establishments JSONB,                             -- Array of establishment details

    -- Related identifiers
    lei VARCHAR(20),                                  -- LEI if found via GLEIF

    -- Data source tracking
    data_source VARCHAR(50) DEFAULT 'kbo_public',     -- kbo_public, kbo_api
    source_url TEXT,                                  -- URL to KBO entry

    -- Full scrape response
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
CREATE INDEX IF NOT EXISTS idx_belgium_registry_legal_entity
    ON belgium_registry_data(legal_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_belgium_registry_kbo_number
    ON belgium_registry_data(kbo_number_clean) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_belgium_registry_vat_number
    ON belgium_registry_data(vat_number) WHERE is_deleted = FALSE AND vat_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_belgium_registry_company_name
    ON belgium_registry_data(company_name) WHERE is_deleted = FALSE;

-- Unique constraint: one active record per legal entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_belgium_registry_unique_active
    ON belgium_registry_data(legal_entity_id) WHERE is_deleted = FALSE;

-- Add trigger to update dt_modified
CREATE OR REPLACE FUNCTION update_belgium_registry_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_belgium_registry_modified ON belgium_registry_data;
CREATE TRIGGER trigger_belgium_registry_modified
    BEFORE UPDATE ON belgium_registry_data
    FOR EACH ROW
    EXECUTE FUNCTION update_belgium_registry_modified();

-- Add comments
COMMENT ON TABLE belgium_registry_data IS 'Stores Belgian KBO (Kruispuntbank van Ondernemingen) company data';
COMMENT ON COLUMN belgium_registry_data.kbo_number IS 'KBO number with dots, e.g., 0439.291.125';
COMMENT ON COLUMN belgium_registry_data.kbo_number_clean IS 'KBO number without formatting, 10 digits';
COMMENT ON COLUMN belgium_registry_data.enterprise_type IS 'Enterprise type: Rechtspersoon (legal entity) or Natuurlijk persoon (natural person)';
COMMENT ON COLUMN belgium_registry_data.bus_number IS 'Belgian bus/box number for addresses (unit within building)';
COMMENT ON COLUMN belgium_registry_data.nace_codes IS 'NACE activity codes with descriptions';

-- Add KBO to legal_entity_number_type if not exists
INSERT INTO legal_entity_number_type (
    type_code, type_name, description, country_scope,
    format_regex, format_example, registry_url, display_order
) VALUES
    ('KBO', 'Kruispuntbank van Ondernemingen', 'Belgian Central Business Register number (10 digits)', 'BE',
     '^0[0-9]{9}$', '0439291125', 'https://kbopub.economie.fgov.be', 30),
    ('BCE', 'Banque-Carrefour des Entreprises', 'Belgian Enterprise Register (French name for KBO)', 'BE',
     '^0[0-9]{9}$', '0439291125', 'https://kbopub.economie.fgov.be', 31)
ON CONFLICT (type_code) DO UPDATE SET
    description = EXCLUDED.description,
    country_scope = EXCLUDED.country_scope,
    registry_url = EXCLUDED.registry_url,
    dt_modified = NOW();

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 059_belgium_registry_data completed successfully';
END $$;
