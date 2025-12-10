-- Migration: 033_peppol_registry_data.sql
-- Description: Create table to store Peppol Directory data and add PEPPOL identifier to views
-- Author: Claude Code
-- Date: 2025-12-09

-- ============================================================================
-- PART 1: Create peppol_registry_data table
-- ============================================================================

CREATE TABLE IF NOT EXISTS peppol_registry_data (
    registry_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Peppol participant identification
    participant_id VARCHAR(255) NOT NULL,          -- Full ID: "iso6523-actorid-upis::0106:12345678"
    participant_scheme VARCHAR(100),               -- Scheme part: "iso6523-actorid-upis"
    participant_value VARCHAR(100),                -- Value part: "0106:12345678"

    -- Entity information from Peppol
    entity_name VARCHAR(500),
    country_code VARCHAR(2),
    registration_date DATE,

    -- Additional identifiers found in Peppol (e.g., VAT, other schemes)
    additional_identifiers JSONB,                  -- Array of {scheme, value} objects

    -- Supported Peppol document types
    document_types JSONB,                          -- Array of document type IDs

    -- Contact and metadata
    geo_info VARCHAR(500),                         -- Geographical information
    websites JSONB,                                -- Array of website URLs
    contacts JSONB,                                -- Array of contact information
    additional_info TEXT,                          -- Free-text additional information

    -- Full API response (audit trail)
    raw_api_response JSONB,

    -- Timestamps
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    data_source VARCHAR(50) DEFAULT 'peppol_directory',

    -- Audit fields
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_peppol_registry_legal_entity ON peppol_registry_data(legal_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_peppol_registry_participant ON peppol_registry_data(participant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_peppol_registry_fetched_at ON peppol_registry_data(fetched_at DESC);

-- Unique constraint: one active Peppol record per legal entity
CREATE UNIQUE INDEX idx_peppol_registry_unique_active ON peppol_registry_data(legal_entity_id)
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

CREATE TRIGGER trigger_peppol_registry_modified
    BEFORE UPDATE ON peppol_registry_data
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON peppol_registry_data TO ctn_app_user;

-- Add comments for documentation
COMMENT ON TABLE peppol_registry_data IS 'Stores Peppol Directory data for legal entities. Peppol is the Pan-European Public Procurement Online network for e-invoicing and document exchange.';
COMMENT ON COLUMN peppol_registry_data.participant_id IS 'Full Peppol participant identifier (e.g., iso6523-actorid-upis::0106:12345678)';
COMMENT ON COLUMN peppol_registry_data.document_types IS 'Array of supported Peppol document type identifiers for e-invoicing';
COMMENT ON COLUMN peppol_registry_data.additional_identifiers IS 'Other identifiers found in Peppol registry (VAT numbers, alternative schemes)';

-- ============================================================================
-- PART 2: Update v_members_full view to include PEPPOL identifier
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
-- PART 3: Update members_view to include PEPPOL identifier
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

-- Verify the migration
SELECT 'peppol_registry_data table created successfully' AS status;
SELECT 'v_members_full view updated with peppol_id column' AS status;
SELECT 'members_view updated with peppol_id column' AS status;
