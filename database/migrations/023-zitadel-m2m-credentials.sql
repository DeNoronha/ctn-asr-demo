-- =====================================================
-- Zitadel M2M Authentication Migration
-- Date: November 6, 2025
-- Purpose: Add Zitadel support for M2M authentication
--          Maps Zitadel client IDs to CTN parties
-- =====================================================

-- =====================================================
-- Zitadel M2M Credentials Table
-- Maps Zitadel service accounts to CTN ASR parties
-- =====================================================
CREATE TABLE IF NOT EXISTS ctn_m2m_credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  modified_by UUID,
  is_deleted BOOLEAN DEFAULT false,

  -- Zitadel identification
  zitadel_client_id VARCHAR(500) NOT NULL UNIQUE, -- Format: {user_id}@{project_id}
  zitadel_project_id VARCHAR(255) NOT NULL,
  zitadel_user_id VARCHAR(255) NOT NULL,
  service_account_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Authentication provider
  auth_provider VARCHAR(50) NOT NULL DEFAULT 'zitadel',
  auth_issuer VARCHAR(500) NOT NULL, -- Zitadel instance URL

  -- Scopes and permissions
  assigned_scopes TEXT[] NOT NULL DEFAULT '{}',
  allowed_endpoints TEXT[], -- Optional: restrict to specific API endpoints

  -- Status management
  is_active BOOLEAN DEFAULT true,
  activation_date TIMESTAMPTZ DEFAULT NOW(),
  deactivation_date TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  last_request_ip VARCHAR(45),

  -- Audit fields
  notes TEXT,

  -- Foreign keys
  CONSTRAINT fk_zitadel_m2m_party
    FOREIGN KEY (party_id)
    REFERENCES party_reference(party_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_zitadel_m2m_created_by
    FOREIGN KEY (created_by)
    REFERENCES party_reference(party_id),

  CONSTRAINT fk_zitadel_m2m_modified_by
    FOREIGN KEY (modified_by)
    REFERENCES party_reference(party_id),

  -- Constraints
  CONSTRAINT chk_zitadel_client_id_format
    CHECK (zitadel_client_id ~* '^[0-9]+@[0-9]+$'), -- Numeric user_id@project_id

  CONSTRAINT chk_zitadel_auth_provider
    CHECK (auth_provider IN ('zitadel', 'azure_ad', 'okta')),

  CONSTRAINT chk_zitadel_scopes_not_empty
    CHECK (array_length(assigned_scopes, 1) > 0),

  CONSTRAINT chk_zitadel_service_account_name
    CHECK (LENGTH(service_account_name) >= 3)
);

-- Indexes for performance
CREATE INDEX idx_zitadel_m2m_party
  ON ctn_m2m_credentials(party_id)
  WHERE is_deleted = false;

CREATE INDEX idx_zitadel_m2m_client_id
  ON ctn_m2m_credentials(zitadel_client_id)
  WHERE is_deleted = false AND is_active = true;

CREATE INDEX idx_zitadel_m2m_project
  ON ctn_m2m_credentials(zitadel_project_id)
  WHERE is_deleted = false;

CREATE INDEX idx_zitadel_m2m_active
  ON ctn_m2m_credentials(is_active)
  WHERE is_active = true AND is_deleted = false;

CREATE INDEX idx_zitadel_m2m_created
  ON ctn_m2m_credentials(dt_created);

CREATE INDEX idx_zitadel_m2m_last_used
  ON ctn_m2m_credentials(last_used_at)
  WHERE last_used_at IS NOT NULL;

-- GIN index for scope searches
CREATE INDEX idx_zitadel_m2m_scopes
  ON ctn_m2m_credentials USING GIN(assigned_scopes);

-- GIN index for endpoint restrictions (if used)
CREATE INDEX idx_zitadel_m2m_endpoints
  ON ctn_m2m_credentials USING GIN(allowed_endpoints)
  WHERE allowed_endpoints IS NOT NULL;

-- =====================================================
-- Zitadel Secret Rotation Audit Table
-- Tracks client secret generation/rotation events
-- CRITICAL: Never store actual secrets
-- =====================================================
CREATE TABLE IF NOT EXISTS ctn_zitadel_secret_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),

  -- Secret metadata (NEVER the actual secret)
  secret_generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID,

  -- Secret was shown to user and must be stored by them
  secret_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,

  -- Revocation tracking
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revocation_reason TEXT,

  -- Context
  generated_from_ip VARCHAR(45),
  user_agent TEXT,

  -- Foreign keys
  CONSTRAINT fk_zitadel_secrets_credential
    FOREIGN KEY (credential_id)
    REFERENCES ctn_m2m_credentials(credential_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_zitadel_secrets_generated_by
    FOREIGN KEY (generated_by)
    REFERENCES party_reference(party_id),

  CONSTRAINT fk_zitadel_secrets_revoked_by
    FOREIGN KEY (revoked_by)
    REFERENCES party_reference(party_id)
);

-- Indexes for audit queries
CREATE INDEX idx_zitadel_secrets_credential
  ON ctn_zitadel_secret_audit(credential_id);

CREATE INDEX idx_zitadel_secrets_generated
  ON ctn_zitadel_secret_audit(secret_generated_at);

CREATE INDEX idx_zitadel_secrets_active
  ON ctn_zitadel_secret_audit(is_revoked)
  WHERE is_revoked = false;

-- =====================================================
-- Views for easy querying
-- =====================================================

-- View: Active Zitadel M2M credentials with party info
CREATE OR REPLACE VIEW v_zitadel_m2m_active AS
SELECT
  c.credential_id,
  c.party_id,
  c.zitadel_client_id,
  c.zitadel_project_id,
  c.service_account_name,
  c.description,
  c.assigned_scopes,
  c.allowed_endpoints,
  c.is_active,
  c.dt_created,
  c.last_used_at,
  c.total_requests,
  -- Secret info (metadata only)
  (
    SELECT COUNT(*)
    FROM ctn_zitadel_secret_audit s
    WHERE s.credential_id = c.credential_id
      AND s.is_revoked = false
  ) as active_secrets_count,
  (
    SELECT MAX(secret_generated_at)
    FROM ctn_zitadel_secret_audit s
    WHERE s.credential_id = c.credential_id
  ) as last_secret_generated_at,
  -- Party info
  p.party_name,
  p.party_type
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
WHERE c.is_deleted = false
  AND c.is_active = true
  AND c.auth_provider = 'zitadel';

-- =====================================================
-- Seed Data: Example M2M Credentials
-- Only for development/testing - REMOVE in production
-- =====================================================

-- Example: Map test-client from setup script to a party
-- INSERT INTO ctn_m2m_credentials (
--   party_id,
--   zitadel_client_id,
--   zitadel_project_id,
--   zitadel_user_id,
--   service_account_name,
--   description,
--   auth_provider,
--   auth_issuer,
--   assigned_scopes,
--   created_by
-- ) VALUES (
--   (SELECT party_id FROM party_reference WHERE party_name = 'Test Party' LIMIT 1),
--   '123456789@987654321', -- From Zitadel setup
--   '987654321',
--   '123456789',
--   'test-client',
--   'Test M2M client for development',
--   'zitadel',
--   'http://localhost:8080',
--   ARRAY['api.access', 'members.read', 'members.write'],
--   (SELECT party_id FROM party_reference WHERE party_name = 'System' LIMIT 1)
-- );

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE ctn_m2m_credentials IS
  'Zitadel M2M authentication credentials mapping service accounts to CTN parties';

COMMENT ON COLUMN ctn_m2m_credentials.zitadel_client_id IS
  'Zitadel client ID in format {user_id}@{project_id} - uniquely identifies service account';

COMMENT ON COLUMN ctn_m2m_credentials.assigned_scopes IS
  'Scopes granted to this M2M client: api.access, members.read, members.write, etc.';

COMMENT ON COLUMN ctn_m2m_credentials.allowed_endpoints IS
  'Optional: Restrict M2M client to specific API endpoints (e.g., /api/v1/members/*)';

COMMENT ON TABLE ctn_zitadel_secret_audit IS
  'Audit log for Zitadel client secret generation. NEVER stores actual secrets.';

-- =====================================================
-- Triggers for automatic timestamp updates
-- =====================================================

-- Update dt_modified on row update
CREATE OR REPLACE FUNCTION update_zitadel_m2m_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dt_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_zitadel_m2m_modified
  BEFORE UPDATE ON ctn_m2m_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_zitadel_m2m_modified();

-- Track usage statistics
CREATE OR REPLACE FUNCTION update_zitadel_m2m_usage(
  p_zitadel_client_id VARCHAR(500),
  p_request_ip VARCHAR(45)
)
RETURNS VOID AS $$
BEGIN
  UPDATE ctn_m2m_credentials
  SET
    last_used_at = NOW(),
    total_requests = total_requests + 1,
    last_request_ip = p_request_ip
  WHERE zitadel_client_id = p_zitadel_client_id
    AND is_active = true
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_zitadel_m2m_usage IS
  'Update usage statistics when M2M client makes API request';

-- =====================================================
-- Security: Row Level Security (Future Enhancement)
-- =====================================================

-- Enable RLS on ctn_m2m_credentials table
-- ALTER TABLE ctn_m2m_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see M2M credentials for their party
-- CREATE POLICY zitadel_m2m_party_isolation ON ctn_m2m_credentials
--   FOR SELECT
--   USING (party_id = current_setting('app.current_party_id')::uuid);

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify tables created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ctn_m2m_credentials') THEN
    RAISE NOTICE 'Migration 023: ctn_m2m_credentials table created successfully';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ctn_zitadel_secret_audit') THEN
    RAISE NOTICE 'Migration 023: ctn_zitadel_secret_audit table created successfully';
  END IF;
END $$;
