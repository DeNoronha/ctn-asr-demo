-- Migration: 049_legal_entity_branding.sql
-- Date: 2025-12-14
-- Description: Add branding table for storing company logos and brand colors
--              to enable member portal theming

-- Create legal_entity_branding table
CREATE TABLE IF NOT EXISTS legal_entity_branding (
    branding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Logo information
    logo_url TEXT,                          -- URL to company logo (from Logo.dev, favicon, etc.)
    logo_source VARCHAR(50),                -- Source: 'logo_dev', 'favicon', 'manual', etc.
    logo_format VARCHAR(10),                -- Format: 'png', 'svg', 'webp', etc.
    favicon_url TEXT,                       -- URL to favicon (smaller icon)

    -- Brand colors (extracted from logo or website)
    primary_color VARCHAR(7),               -- Hex color code (e.g., '#0066b3')
    secondary_color VARCHAR(7),             -- Secondary brand color
    accent_color VARCHAR(7),                -- Accent/highlight color
    background_color VARCHAR(7),            -- Preferred background color
    text_color VARCHAR(7),                  -- Preferred text color on primary

    -- Theme preference
    preferred_theme VARCHAR(10) DEFAULT 'light', -- 'light' or 'dark'

    -- Source tracking
    extracted_from_domain VARCHAR(255),     -- Domain used for extraction
    extracted_at TIMESTAMP WITH TIME ZONE,  -- When branding was extracted

    -- Audit fields
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    modified_by VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Ensure one active branding record per legal entity
    CONSTRAINT uq_legal_entity_branding_active UNIQUE (legal_entity_id)
);

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_legal_entity_branding_entity
    ON legal_entity_branding(legal_entity_id)
    WHERE is_deleted = FALSE;

-- Add trigger to update dt_modified
CREATE OR REPLACE FUNCTION update_legal_entity_branding_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_legal_entity_branding_modified ON legal_entity_branding;
CREATE TRIGGER trigger_legal_entity_branding_modified
    BEFORE UPDATE ON legal_entity_branding
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_entity_branding_modified();

-- Add comments
COMMENT ON TABLE legal_entity_branding IS 'Stores company branding information (logos, colors) for member portal theming';
COMMENT ON COLUMN legal_entity_branding.logo_url IS 'URL to company logo, fetched from Logo.dev or other sources';
COMMENT ON COLUMN legal_entity_branding.primary_color IS 'Primary brand color in hex format (e.g., #0066b3)';
COMMENT ON COLUMN legal_entity_branding.logo_source IS 'Source of the logo: logo_dev, favicon, manual, brandfetch, etc.';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON legal_entity_branding TO ctn_app_user;
