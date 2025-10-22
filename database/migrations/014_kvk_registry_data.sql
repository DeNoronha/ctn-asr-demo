-- Migration: 014_kvk_registry_data.sql
-- Description: Create table to store full KvK registry data from API responses
-- Author: Claude Code
-- Date: 2025-10-22

-- Create table for KvK registry data (extensible for other country registries)
CREATE TABLE IF NOT EXISTS kvk_registry_data (
    registry_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Core KvK information
    kvk_number VARCHAR(20) NOT NULL,
    company_name VARCHAR(500) NOT NULL,
    legal_form VARCHAR(200),  -- e.g., "Eenmanszaak", "BV", "NV"

    -- Business names
    trade_names JSONB,  -- Array of handelsnamen

    -- Registration dates
    formal_registration_date DATE,  -- formeleRegistratiedatum
    material_registration_date DATE,  -- materieleRegistratie.datumAanvang

    -- Status
    company_status VARCHAR(100),  -- "Active", "Faillissement", "Ontbonden", etc.

    -- Address information
    addresses JSONB,  -- Array of address objects from _embedded.hoofdvestiging.adressen

    -- Business activities
    sbi_activities JSONB,  -- Array of SBI codes and descriptions

    -- Employee count
    total_employees INTEGER,

    -- Links to detailed profiles
    kvk_profile_url TEXT,
    establishment_profile_url TEXT,

    -- Full API response (for future reference and extensibility)
    raw_api_response JSONB NOT NULL,

    -- Metadata
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    data_source VARCHAR(50) DEFAULT 'kvk_api',  -- For extensibility: 'companies_house', 'handelsregister', etc.

    -- Audit fields
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_kvk_registry_legal_entity ON kvk_registry_data(legal_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_kvk_registry_kvk_number ON kvk_registry_data(kvk_number) WHERE is_deleted = FALSE;
CREATE INDEX idx_kvk_registry_fetched_at ON kvk_registry_data(fetched_at DESC);

-- Unique constraint: one active KvK record per legal entity
CREATE UNIQUE INDEX idx_kvk_registry_unique_active ON kvk_registry_data(legal_entity_id)
    WHERE is_deleted = FALSE;

-- Add trigger to update dt_modified
CREATE OR REPLACE FUNCTION update_kvk_registry_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kvk_registry_modified
    BEFORE UPDATE ON kvk_registry_data
    FOR EACH ROW
    EXECUTE FUNCTION update_kvk_registry_modified();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON kvk_registry_data TO ctn_app_user;

-- Add comment for documentation
COMMENT ON TABLE kvk_registry_data IS 'Stores complete KvK (Dutch Chamber of Commerce) registry data fetched from the KvK API. Designed to be extensible for other country business registries.';
COMMENT ON COLUMN kvk_registry_data.raw_api_response IS 'Complete JSON response from KvK API for audit trail and future data extraction';
COMMENT ON COLUMN kvk_registry_data.data_source IS 'Source registry system (kvk_api, companies_house, handelsregister, etc.) for future multi-country support';
