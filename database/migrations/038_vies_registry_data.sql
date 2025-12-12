-- Migration: 038_vies_registry_data.sql
-- Description: Create table to store VIES (VAT Information Exchange System) data
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================================
-- PART 1: Create vies_registry_data table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vies_registry_data (
    registry_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- VAT identification
    country_code VARCHAR(2) NOT NULL,                 -- EU country code (NL, DE, BE, etc.)
    vat_number VARCHAR(20) NOT NULL,                  -- VAT number without country prefix (e.g., 001671248B03)
    full_vat_number VARCHAR(25),                      -- Full VAT with country prefix (e.g., NL001671248B03)

    -- Validation result from VIES
    is_valid BOOLEAN NOT NULL,                        -- true = valid VAT, false = invalid
    user_error VARCHAR(50),                           -- VALID, INVALID, etc.
    request_date TIMESTAMP WITH TIME ZONE,            -- When VIES processed the request
    request_identifier VARCHAR(100),                  -- VIES consultation number (for audit)

    -- Company information from VIES
    trader_name VARCHAR(500),                         -- Official registered company name
    trader_address TEXT,                              -- Full address as returned by VIES

    -- VIES approximate matching data (optional, for cross-validation)
    approx_name VARCHAR(500),                         -- Approximate name match result
    approx_street VARCHAR(500),                       -- Approximate street match result
    approx_postal_code VARCHAR(20),                   -- Approximate postal code match result
    approx_city VARCHAR(100),                         -- Approximate city match result
    approx_company_type VARCHAR(100),                 -- Approximate company type match result
    match_name INTEGER,                               -- Match score for name (1=match, 2=no match, 3=not processed)
    match_street INTEGER,                             -- Match score for street
    match_postal_code INTEGER,                        -- Match score for postal code
    match_city INTEGER,                               -- Match score for city
    match_company_type INTEGER,                       -- Match score for company type

    -- Full API response (audit trail)
    raw_api_response JSONB,

    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    data_source VARCHAR(50) DEFAULT 'vies_ec_europa',

    -- Audit fields
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_vies_registry_legal_entity ON vies_registry_data(legal_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_vies_registry_vat ON vies_registry_data(country_code, vat_number) WHERE is_deleted = FALSE;
CREATE INDEX idx_vies_registry_full_vat ON vies_registry_data(full_vat_number) WHERE is_deleted = FALSE;
CREATE INDEX idx_vies_registry_fetched_at ON vies_registry_data(fetched_at DESC);
CREATE INDEX idx_vies_registry_valid ON vies_registry_data(is_valid) WHERE is_deleted = FALSE;

-- Unique constraint: one active VIES record per legal entity
CREATE UNIQUE INDEX idx_vies_registry_unique_active ON vies_registry_data(legal_entity_id)
    WHERE is_deleted = FALSE;

-- Add trigger to update dt_modified (reuse existing function if available)
DO $$
BEGIN
    -- Create trigger function if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
        CREATE FUNCTION update_modified_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.dt_modified = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
    END IF;
END $$;

CREATE TRIGGER trigger_vies_registry_modified
    BEFORE UPDATE ON vies_registry_data
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Grant permissions (wrapped in DO block to handle missing role gracefully)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ctn_app_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON vies_registry_data TO ctn_app_user;
        RAISE NOTICE 'Granted permissions to ctn_app_user';
    ELSE
        RAISE NOTICE 'Role ctn_app_user does not exist - skipping GRANT (table accessible via current user)';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE vies_registry_data IS 'Stores VIES (VAT Information Exchange System) validation data from the European Commission. Used for VAT number verification across EU member states.';
COMMENT ON COLUMN vies_registry_data.vat_number IS 'VAT number without country prefix (e.g., 001671248B03 for Netherlands)';
COMMENT ON COLUMN vies_registry_data.full_vat_number IS 'Full VAT number with country prefix (e.g., NL001671248B03)';
COMMENT ON COLUMN vies_registry_data.is_valid IS 'Whether the VAT number is currently valid according to VIES';
COMMENT ON COLUMN vies_registry_data.trader_name IS 'Official company name as registered in the national VAT database';
COMMENT ON COLUMN vies_registry_data.trader_address IS 'Official company address as registered in the national VAT database';
COMMENT ON COLUMN vies_registry_data.match_name IS 'VIES approximate matching: 1=match, 2=no match, 3=not processed';
COMMENT ON COLUMN vies_registry_data.request_identifier IS 'VIES consultation number for audit purposes';

-- ============================================================================
-- PART 2: Add VIES to legal_entity_number_type lookup table
-- ============================================================================

INSERT INTO legal_entity_number_type (
    type_code, type_name, description, country_scope, format_regex, format_example, registry_url, display_order
) VALUES (
    'VIES',
    'VIES Validated VAT',
    'VAT number validated through EU VIES system - confirms active VAT registration',
    NULL,  -- Global (all EU countries)
    '^[A-Z]{2}[A-Z0-9]{2,13}$',
    'NL001671248B03',
    'https://ec.europa.eu/taxation_customs/vies',
    31  -- After VAT (30) in display order
)
ON CONFLICT (type_code) DO UPDATE SET
    type_name = EXCLUDED.type_name,
    description = EXCLUDED.description,
    format_regex = EXCLUDED.format_regex,
    format_example = EXCLUDED.format_example,
    registry_url = EXCLUDED.registry_url,
    display_order = EXCLUDED.display_order,
    dt_modified = NOW();

-- ============================================================================
-- PART 3: Update v_members_full view to include VIES identifier
-- ============================================================================

DROP VIEW IF EXISTS v_members_full;

CREATE OR REPLACE VIEW v_members_full AS
 SELECT m.id,
    m.org_id,
    m.legal_entity_id,
    m.azure_ad_object_id,
    m.email,
    m.created_at,
    m.updated_at,
    m.metadata AS member_metadata,
    le.primary_legal_name AS legal_name,
    le.domain,
    le.status,
    le.membership_level,
    le.authentication_tier,
    le.authentication_method,
    le.metadata AS legal_entity_metadata,
    le.party_id,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'LEI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS lei,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'KVK'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS kvk,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'RSIN'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS rsin,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EUID'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS euid,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EORI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS eori,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'DUNS'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS duns,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'VAT'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS vat,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'VIES'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS vies,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'PEPPOL'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS peppol_id,
    ( SELECT count(*) AS count
           FROM legal_entity_contact lec
          WHERE ((lec.legal_entity_id = m.legal_entity_id) AND (lec.is_deleted = false))) AS contact_count,
    ( SELECT count(*) AS count
           FROM legal_entity_endpoint lee
          WHERE ((lee.legal_entity_id = m.legal_entity_id) AND (lee.is_deleted = false))) AS endpoint_count
   FROM ((members m
     LEFT JOIN legal_entity le ON (((m.legal_entity_id = le.legal_entity_id) AND (le.is_deleted = false))))
     LEFT JOIN legal_entity_number len ON (((le.legal_entity_id = len.legal_entity_id) AND (len.is_deleted = false))))
  GROUP BY m.id, m.org_id, m.legal_entity_id, m.azure_ad_object_id, m.email, m.created_at, m.updated_at, m.metadata, le.primary_legal_name, le.domain, le.status, le.membership_level, le.authentication_tier, le.authentication_method, le.metadata, le.party_id;

-- ============================================================================
-- PART 4: Update members_view to include VIES identifier
-- ============================================================================

DROP VIEW IF EXISTS members_view;

CREATE OR REPLACE VIEW members_view AS
 SELECT le.legal_entity_id,
    le.primary_legal_name AS legal_name,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'LEI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS lei,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'KVK'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS kvk,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'RSIN'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS rsin,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EUID'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS euid,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'EORI'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS eori,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'DUNS'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS duns,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'VAT'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS vat,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'VIES'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS vies,
    max((
        CASE
            WHEN ((len.identifier_type)::text = 'PEPPOL'::text) THEN len.identifier_value
            ELSE NULL::character varying
        END)::text) AS peppol_id,
    le.domain,
    le.status,
    le.membership_level,
    le.dt_created AS created_at,
    le.metadata
   FROM (legal_entity le
     LEFT JOIN legal_entity_number len ON ((le.legal_entity_id = len.legal_entity_id)))
  WHERE (le.is_deleted = false)
  GROUP BY le.legal_entity_id, le.primary_legal_name, le.domain, le.status, le.membership_level, le.dt_created, le.metadata;

-- ============================================================================
-- Verify migration
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 038_vies_registry_data completed successfully';
    RAISE NOTICE 'Created vies_registry_data table for VIES VAT validation data';
    RAISE NOTICE 'Added VIES to legal_entity_number_type lookup table';
    RAISE NOTICE 'Updated v_members_full and members_view with RSIN, VAT, and VIES columns';
END $$;

SELECT 'vies_registry_data table created successfully' AS status;
SELECT type_code, type_name, display_order FROM legal_entity_number_type WHERE type_code = 'VIES';
