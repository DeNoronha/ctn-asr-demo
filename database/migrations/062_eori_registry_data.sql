-- Migration: 062_eori_registry_data.sql
-- Date: 2025-12-17
-- Description: Create table to store EU EORI (Economic Operators Registration and Identification) validation data
--              Data sourced from EU EORI SOAP validation service (ec.europa.eu)

-- Create table for EORI registry data
CREATE TABLE IF NOT EXISTS eori_registry_data (
    registry_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- EORI identification
    eori_number VARCHAR(20) NOT NULL,             -- Full EORI number (e.g., NL123456789, DE12345678912345)
    country_code VARCHAR(2) NOT NULL,             -- 2-letter country code (NL, DE, BE, etc.)

    -- Validation result from EU EORI service
    status VARCHAR(50) NOT NULL,                  -- '0' = valid, '1' = invalid, '2' = error
    status_description VARCHAR(255),              -- Human-readable status description
    error_reason VARCHAR(500),                    -- Error reason if status is invalid/error

    -- Trader information (returned for valid EORI)
    trader_name VARCHAR(500),                     -- Company/trader name
    trader_address TEXT,                          -- Full address as returned by service

    -- Parsed address components (best effort parsing)
    street VARCHAR(255),
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),

    -- Request tracking
    request_date TIMESTAMP WITH TIME ZONE,        -- When the validation was performed
    request_identifier VARCHAR(100),              -- Consultation ID for audit trail

    -- Data source tracking
    data_source VARCHAR(50) DEFAULT 'ec_eori_soap', -- ec_eori_soap, ec_eori_manual
    raw_api_response JSONB,                       -- Full SOAP response for debugging

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
CREATE INDEX IF NOT EXISTS idx_eori_registry_legal_entity
    ON eori_registry_data(legal_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_eori_registry_eori_number
    ON eori_registry_data(eori_number) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_eori_registry_country
    ON eori_registry_data(country_code) WHERE is_deleted = FALSE;

-- Unique constraint: one active record per legal entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_eori_registry_unique_active
    ON eori_registry_data(legal_entity_id) WHERE is_deleted = FALSE;

-- Add trigger to update dt_modified
CREATE OR REPLACE FUNCTION update_eori_registry_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_eori_registry_modified ON eori_registry_data;
CREATE TRIGGER trigger_eori_registry_modified
    BEFORE UPDATE ON eori_registry_data
    FOR EACH ROW
    EXECUTE FUNCTION update_eori_registry_modified();

-- Add comments
COMMENT ON TABLE eori_registry_data IS 'Stores EU EORI (Economic Operators Registration and Identification) validation data from EC SOAP service';
COMMENT ON COLUMN eori_registry_data.eori_number IS 'Full EORI number with country prefix (e.g., NL123456789)';
COMMENT ON COLUMN eori_registry_data.status IS 'EORI validation status: 0=valid, 1=invalid, 2=error';
COMMENT ON COLUMN eori_registry_data.trader_name IS 'Company/trader name as registered in customs system';

-- Add EORI to legal_entity_number_type if not exists
INSERT INTO legal_entity_number_type (
    type_code, type_name, description, country_scope,
    format_regex, format_example, registry_url, display_order
) VALUES
    ('EORI', 'Economic Operators Registration and Identification',
     'EU customs number for import/export operations. Format: 2-letter country code + up to 15 alphanumeric characters.',
     'EU',
     '^[A-Z]{2}[A-Z0-9]{1,15}$', 'NL123456789',
     'https://ec.europa.eu/taxation_customs/dds2/eos/eori_validation.jsp', 25)
ON CONFLICT (type_code) DO UPDATE SET
    description = EXCLUDED.description,
    country_scope = EXCLUDED.country_scope,
    format_regex = EXCLUDED.format_regex,
    registry_url = EXCLUDED.registry_url,
    dt_modified = NOW();

-- Verify migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 062_eori_registry_data completed successfully';
END $$;
