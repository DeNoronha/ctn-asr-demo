-- =====================================================
-- Migrate from Zitadel-specific to Generic M2M Naming
-- Date: November 13, 2025
-- Purpose: Rename Zitadel-specific columns to support multiple IAM providers
--          Enables Keycloak (Cloud IAM) integration
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Rename Columns
-- =====================================================

-- Rename Zitadel-specific columns to generic M2M naming
ALTER TABLE ctn_m2m_credentials
  RENAME COLUMN zitadel_client_id TO m2m_client_id;

ALTER TABLE ctn_m2m_credentials
  RENAME COLUMN zitadel_project_id TO m2m_realm_id;

ALTER TABLE ctn_m2m_credentials
  RENAME COLUMN zitadel_user_id TO m2m_user_id;

DO $$ BEGIN RAISE NOTICE 'Step 1: Renamed columns to generic M2M naming'; END $$;

-- =====================================================
-- STEP 2: Update Constraints
-- =====================================================

-- Drop old constraint (Zitadel-specific format)
ALTER TABLE ctn_m2m_credentials
  DROP CONSTRAINT IF EXISTS chk_zitadel_client_id_format;

-- Add new constraint (supports both Zitadel and Keycloak formats)
ALTER TABLE ctn_m2m_credentials
  ADD CONSTRAINT chk_m2m_client_id_not_empty
    CHECK (LENGTH(m2m_client_id) >= 3);

-- Update auth_provider constraint to include 'keycloak'
ALTER TABLE ctn_m2m_credentials
  DROP CONSTRAINT IF EXISTS chk_zitadel_auth_provider;

ALTER TABLE ctn_m2m_credentials
  ADD CONSTRAINT chk_m2m_auth_provider
    CHECK (auth_provider IN ('zitadel', 'keycloak', 'azure_ad', 'okta'));

-- Rename other constraints for consistency
ALTER TABLE ctn_m2m_credentials
  RENAME CONSTRAINT chk_zitadel_scopes_not_empty TO chk_m2m_scopes_not_empty;

ALTER TABLE ctn_m2m_credentials
  RENAME CONSTRAINT chk_zitadel_service_account_name TO chk_m2m_service_account_name;

ALTER TABLE ctn_m2m_credentials
  RENAME CONSTRAINT fk_zitadel_m2m_party TO fk_m2m_party;

ALTER TABLE ctn_m2m_credentials
  RENAME CONSTRAINT fk_zitadel_m2m_created_by TO fk_m2m_created_by;

ALTER TABLE ctn_m2m_credentials
  RENAME CONSTRAINT fk_zitadel_m2m_modified_by TO fk_m2m_modified_by;

DO $$ BEGIN RAISE NOTICE 'Step 2: Updated constraints'; END $$;

-- =====================================================
-- STEP 3: Recreate Indexes
-- =====================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_zitadel_m2m_party;
DROP INDEX IF EXISTS idx_zitadel_m2m_client_id;
DROP INDEX IF EXISTS idx_zitadel_m2m_project;
DROP INDEX IF EXISTS idx_zitadel_m2m_active;
DROP INDEX IF EXISTS idx_zitadel_m2m_created;
DROP INDEX IF EXISTS idx_zitadel_m2m_last_used;
DROP INDEX IF EXISTS idx_zitadel_m2m_scopes;
DROP INDEX IF EXISTS idx_zitadel_m2m_endpoints;

-- Create new indexes with generic naming
CREATE INDEX idx_m2m_credentials_party
  ON ctn_m2m_credentials(party_id)
  WHERE is_deleted = false;

CREATE INDEX idx_m2m_credentials_client_id
  ON ctn_m2m_credentials(m2m_client_id)
  WHERE is_deleted = false AND is_active = true;

CREATE INDEX idx_m2m_credentials_realm
  ON ctn_m2m_credentials(m2m_realm_id)
  WHERE is_deleted = false;

CREATE INDEX idx_m2m_credentials_active
  ON ctn_m2m_credentials(is_active)
  WHERE is_active = true AND is_deleted = false;

CREATE INDEX idx_m2m_credentials_created
  ON ctn_m2m_credentials(dt_created);

CREATE INDEX idx_m2m_credentials_last_used
  ON ctn_m2m_credentials(last_used_at)
  WHERE last_used_at IS NOT NULL;

-- GIN index for scope searches
CREATE INDEX idx_m2m_credentials_scopes
  ON ctn_m2m_credentials USING GIN(assigned_scopes);

-- GIN index for endpoint restrictions
CREATE INDEX idx_m2m_credentials_endpoints
  ON ctn_m2m_credentials USING GIN(allowed_endpoints)
  WHERE allowed_endpoints IS NOT NULL;

DO $$ BEGIN RAISE NOTICE 'Step 3: Recreated indexes with generic naming'; END $$;

-- =====================================================
-- STEP 4: Rename Audit Table and Update References
-- =====================================================

-- Rename secret audit table
ALTER TABLE ctn_zitadel_secret_audit
  RENAME TO ctn_m2m_secret_audit;

-- Rename constraints
ALTER TABLE ctn_m2m_secret_audit
  RENAME CONSTRAINT fk_zitadel_secrets_credential TO fk_m2m_secrets_credential;

ALTER TABLE ctn_m2m_secret_audit
  RENAME CONSTRAINT fk_zitadel_secrets_generated_by TO fk_m2m_secrets_generated_by;

ALTER TABLE ctn_m2m_secret_audit
  RENAME CONSTRAINT fk_zitadel_secrets_revoked_by TO fk_m2m_secrets_revoked_by;

-- Drop old indexes
DROP INDEX IF EXISTS idx_zitadel_secrets_credential;
DROP INDEX IF EXISTS idx_zitadel_secrets_generated;
DROP INDEX IF EXISTS idx_zitadel_secrets_active;

-- Create new indexes
CREATE INDEX idx_m2m_secrets_credential
  ON ctn_m2m_secret_audit(credential_id);

CREATE INDEX idx_m2m_secrets_generated
  ON ctn_m2m_secret_audit(secret_generated_at);

CREATE INDEX idx_m2m_secrets_active
  ON ctn_m2m_secret_audit(is_revoked)
  WHERE is_revoked = false;

DO $$ BEGIN RAISE NOTICE 'Step 4: Renamed audit table and updated references'; END $$;

-- =====================================================
-- STEP 5: Recreate Views
-- =====================================================

-- Drop old view
DROP VIEW IF EXISTS v_zitadel_m2m_active;

-- Create new view with generic naming and support for all providers
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT
  c.credential_id,
  c.party_id,
  c.m2m_client_id,
  c.m2m_realm_id,
  c.m2m_user_id,
  c.service_account_name,
  c.description,
  c.auth_provider,
  c.auth_issuer,
  c.assigned_scopes,
  c.allowed_endpoints,
  c.is_active,
  c.dt_created,
  c.dt_modified,
  c.last_used_at,
  c.total_requests,
  c.last_request_ip,
  -- Secret info (metadata only)
  (
    SELECT COUNT(*)
    FROM ctn_m2m_secret_audit s
    WHERE s.credential_id = c.credential_id
      AND s.is_revoked = false
  ) as active_secrets_count,
  (
    SELECT MAX(secret_generated_at)
    FROM ctn_m2m_secret_audit s
    WHERE s.credential_id = c.credential_id
  ) as last_secret_generated_at,
  -- Party info
  p.party_name,
  p.party_type
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
WHERE c.is_deleted = false
  AND c.is_active = true;

DO $$ BEGIN RAISE NOTICE 'Step 5: Recreated views with generic naming'; END $$;

-- =====================================================
-- STEP 6: Update Functions
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS update_zitadel_m2m_usage(VARCHAR, VARCHAR);

-- Create new function with generic naming
CREATE OR REPLACE FUNCTION update_m2m_credentials_usage(
  p_m2m_client_id VARCHAR(500),
  p_request_ip VARCHAR(45)
)
RETURNS VOID AS $$
BEGIN
  UPDATE ctn_m2m_credentials
  SET
    last_used_at = NOW(),
    total_requests = total_requests + 1,
    last_request_ip = p_request_ip
  WHERE m2m_client_id = p_m2m_client_id
    AND is_active = true
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_m2m_credentials_usage IS
  'Update usage statistics when M2M client makes API request (supports all IAM providers)';

-- Rename trigger function
DROP FUNCTION IF EXISTS update_zitadel_m2m_modified() CASCADE;

CREATE OR REPLACE FUNCTION update_m2m_credentials_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dt_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_zitadel_m2m_modified ON ctn_m2m_credentials;

CREATE TRIGGER trg_m2m_credentials_modified
  BEFORE UPDATE ON ctn_m2m_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_m2m_credentials_modified();

DO $$ BEGIN RAISE NOTICE 'Step 6: Updated functions and triggers'; END $$;

-- =====================================================
-- STEP 7: Update Comments
-- =====================================================

COMMENT ON TABLE ctn_m2m_credentials IS
  'M2M authentication credentials mapping service accounts to CTN parties. Supports Zitadel, Keycloak, Azure AD, and Okta.';

COMMENT ON COLUMN ctn_m2m_credentials.m2m_client_id IS
  'M2M client ID - format varies by provider. Zitadel: {user_id}@{project_id}, Keycloak: client_id or username';

COMMENT ON COLUMN ctn_m2m_credentials.m2m_realm_id IS
  'IAM realm/project ID. Zitadel: project_id, Keycloak: realm name, Azure AD: tenant_id';

COMMENT ON COLUMN ctn_m2m_credentials.m2m_user_id IS
  'Service account user ID within the IAM provider';

COMMENT ON COLUMN ctn_m2m_credentials.auth_provider IS
  'IAM provider: zitadel, keycloak, azure_ad, okta';

COMMENT ON COLUMN ctn_m2m_credentials.auth_issuer IS
  'IAM issuer URL. Example: https://lemur-8.cloud-iam.com/auth/realms/ctn-test for Keycloak';

COMMENT ON COLUMN ctn_m2m_credentials.assigned_scopes IS
  'Scopes/roles granted to this M2M client: api.access, members.read, members.write, etc.';

COMMENT ON COLUMN ctn_m2m_credentials.allowed_endpoints IS
  'Optional: Restrict M2M client to specific API endpoints (e.g., /api/v1/members/*)';

COMMENT ON TABLE ctn_m2m_secret_audit IS
  'Audit log for M2M client secret generation. NEVER stores actual secrets. Works with all IAM providers.';

DO $$ BEGIN RAISE NOTICE 'Step 7: Updated table and column comments'; END $$;

-- =====================================================
-- STEP 8: Data Migration (if needed)
-- =====================================================

-- Update existing Zitadel records to keep auth_provider = 'zitadel'
-- No data changes needed - column renames are transparent

DO $$ BEGIN RAISE NOTICE 'Step 8: Data migration complete (no changes needed)'; END $$;

-- =====================================================
-- STEP 9: Validation
-- =====================================================

DO $$
DECLARE
  v_m2m_count INTEGER;
  v_audit_count INTEGER;
BEGIN
  -- Count M2M credentials
  SELECT COUNT(*) INTO v_m2m_count FROM ctn_m2m_credentials;
  RAISE NOTICE 'Found % M2M credentials', v_m2m_count;

  -- Count audit records
  SELECT COUNT(*) INTO v_audit_count FROM ctn_m2m_secret_audit;
  RAISE NOTICE 'Found % secret audit records', v_audit_count;

  -- Verify indexes exist
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_m2m_credentials_client_id') THEN
    RAISE NOTICE 'Critical index idx_m2m_credentials_client_id exists ✓';
  ELSE
    RAISE EXCEPTION 'Critical index idx_m2m_credentials_client_id missing!';
  END IF;

  -- Verify view exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_m2m_credentials_active') THEN
    RAISE NOTICE 'View v_m2m_credentials_active exists ✓';
  ELSE
    RAISE EXCEPTION 'View v_m2m_credentials_active missing!';
  END IF;

  -- Verify function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_m2m_credentials_usage') THEN
    RAISE NOTICE 'Function update_m2m_credentials_usage exists ✓';
  ELSE
    RAISE EXCEPTION 'Function update_m2m_credentials_usage missing!';
  END IF;

  RAISE NOTICE '✓ Migration 026 completed successfully!';
END $$;

COMMIT;
