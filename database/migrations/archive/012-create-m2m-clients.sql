-- =====================================================
-- M2M Client Management Migration
-- Implements: M2M client registration and secret audit
-- Date: October 25, 2025
-- Purpose: Enable legal entities to register M2M clients
--          for API access with scoped permissions
-- =====================================================

-- =====================================================
-- M2M Clients Table
-- Stores M2M client registrations linked to legal entities
-- =====================================================
CREATE TABLE IF NOT EXISTS m2m_clients (
  m2m_client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  modified_by UUID,
  is_deleted BOOLEAN DEFAULT false,

  -- Client identification
  client_name VARCHAR(255) NOT NULL,
  azure_client_id UUID NOT NULL UNIQUE,
  azure_object_id UUID,
  description TEXT,

  -- Scopes and permissions
  assigned_scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Status management
  is_active BOOLEAN DEFAULT true,
  activation_date TIMESTAMPTZ DEFAULT NOW(),
  deactivation_date TIMESTAMPTZ,
  deactivation_reason TEXT,

  -- Foreign keys
  CONSTRAINT fk_m2m_legal_entity
    FOREIGN KEY (legal_entity_id)
    REFERENCES legal_entity(legal_entity_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_m2m_created_by
    FOREIGN KEY (created_by)
    REFERENCES party_reference(party_id),

  CONSTRAINT fk_m2m_modified_by
    FOREIGN KEY (modified_by)
    REFERENCES party_reference(party_id),

  -- Constraints
  CONSTRAINT chk_m2m_client_name_length
    CHECK (LENGTH(client_name) >= 3),

  CONSTRAINT chk_m2m_scopes_not_empty
    CHECK (array_length(assigned_scopes, 1) > 0)
);

-- Indexes for performance
CREATE INDEX idx_m2m_clients_legal_entity
  ON m2m_clients(legal_entity_id)
  WHERE is_deleted = false;

CREATE INDEX idx_m2m_clients_azure_client_id
  ON m2m_clients(azure_client_id)
  WHERE is_deleted = false;

CREATE INDEX idx_m2m_clients_active
  ON m2m_clients(is_active)
  WHERE is_active = true AND is_deleted = false;

CREATE INDEX idx_m2m_clients_created
  ON m2m_clients(dt_created);

CREATE INDEX idx_m2m_clients_deleted
  ON m2m_clients(is_deleted)
  WHERE is_deleted = false;

-- GIN index for scope searches
CREATE INDEX idx_m2m_clients_scopes
  ON m2m_clients USING GIN(assigned_scopes);

-- =====================================================
-- M2M Client Secrets Audit Table
-- Audit log for client secret generation
-- CRITICAL: Never store actual secrets, only metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS m2m_client_secrets_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  m2m_client_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),

  -- Secret metadata (NEVER the actual secret)
  secret_generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID,
  expires_at TIMESTAMPTZ,

  -- Revocation tracking
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revocation_reason TEXT,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Context
  generated_from_ip VARCHAR(45),
  user_agent TEXT,

  -- Foreign keys
  CONSTRAINT fk_m2m_secrets_client
    FOREIGN KEY (m2m_client_id)
    REFERENCES m2m_clients(m2m_client_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_m2m_secrets_generated_by
    FOREIGN KEY (generated_by)
    REFERENCES party_reference(party_id),

  CONSTRAINT fk_m2m_secrets_revoked_by
    FOREIGN KEY (revoked_by)
    REFERENCES party_reference(party_id)
);

-- Indexes for audit queries
CREATE INDEX idx_m2m_secrets_audit_client
  ON m2m_client_secrets_audit(m2m_client_id);

CREATE INDEX idx_m2m_secrets_audit_generated
  ON m2m_client_secrets_audit(secret_generated_at);

CREATE INDEX idx_m2m_secrets_audit_active
  ON m2m_client_secrets_audit(is_revoked)
  WHERE is_revoked = false;

CREATE INDEX idx_m2m_secrets_audit_expires
  ON m2m_client_secrets_audit(expires_at)
  WHERE expires_at IS NOT NULL;

-- =====================================================
-- Views for easy querying
-- =====================================================

-- View: Active M2M clients with latest secret info
CREATE OR REPLACE VIEW v_m2m_clients_active AS
SELECT
  c.m2m_client_id,
  c.legal_entity_id,
  c.client_name,
  c.azure_client_id,
  c.azure_object_id,
  c.description,
  c.assigned_scopes,
  c.is_active,
  c.dt_created,
  c.dt_modified,
  -- Latest secret info (metadata only)
  (
    SELECT COUNT(*)
    FROM m2m_client_secrets_audit s
    WHERE s.m2m_client_id = c.m2m_client_id
      AND s.is_revoked = false
  ) as active_secrets_count,
  (
    SELECT MAX(secret_generated_at)
    FROM m2m_client_secrets_audit s
    WHERE s.m2m_client_id = c.m2m_client_id
  ) as last_secret_generated_at,
  -- Legal entity info
  le.primary_legal_name,
  le.domain
FROM m2m_clients c
LEFT JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
WHERE c.is_deleted = false
  AND c.is_active = true;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE m2m_clients IS
  'M2M client registrations for API access. Linked to legal entities with scoped permissions.';

COMMENT ON COLUMN m2m_clients.azure_client_id IS
  'Azure AD application (client) ID for OAuth2 client credentials flow';

COMMENT ON COLUMN m2m_clients.assigned_scopes IS
  'Array of scope strings: ETA.Read, Container.Read, Booking.Read, Booking.Write, Orchestration.Read';

COMMENT ON TABLE m2m_client_secrets_audit IS
  'Audit log for M2M client secret generation and revocation. NEVER stores actual secrets.';

COMMENT ON COLUMN m2m_client_secrets_audit.secret_generated_at IS
  'Timestamp when secret was generated (not stored). Secret shown only once to user.';

-- =====================================================
-- Security: Row Level Security (Future Enhancement)
-- =====================================================
-- Enable RLS on m2m_clients table
-- ALTER TABLE m2m_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see M2M clients for their legal entity
-- CREATE POLICY m2m_clients_tenant_isolation ON m2m_clients
--   FOR SELECT
--   USING (legal_entity_id IN (
--     SELECT legal_entity_id
--     FROM legal_entity
--     WHERE party_id = current_setting('app.current_party_id')::uuid
--   ));
