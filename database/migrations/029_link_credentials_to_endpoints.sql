-- Migration 029: Link Access Credentials to Published Endpoints
-- Purpose: Establish 1:N relationship (one endpoint can have multiple credentials)
-- Date: 2025-11-20
-- Author: Ramon de Noronha

-- ========================================
-- Add endpoint reference to M2M clients
-- ========================================
ALTER TABLE m2m_clients
  ADD COLUMN legal_entity_endpoint_id UUID;

-- Add foreign key constraint
ALTER TABLE m2m_clients
  ADD CONSTRAINT fk_m2m_clients_endpoint
  FOREIGN KEY (legal_entity_endpoint_id)
  REFERENCES legal_entity_endpoint(legal_entity_endpoint_id)
  ON DELETE SET NULL;  -- If endpoint deleted, don't cascade delete credentials

-- Add index for performance
CREATE INDEX idx_m2m_clients_endpoint ON m2m_clients(legal_entity_endpoint_id);

-- ========================================
-- Add endpoint reference to legacy tokens
-- ========================================
ALTER TABLE access_tokens
  ADD COLUMN legal_entity_endpoint_id UUID;

-- Add foreign key constraint
ALTER TABLE access_tokens
  ADD CONSTRAINT fk_access_tokens_endpoint
  FOREIGN KEY (legal_entity_endpoint_id)
  REFERENCES legal_entity_endpoint(legal_entity_endpoint_id)
  ON DELETE SET NULL;  -- If endpoint deleted, don't cascade delete credentials

-- Add index for performance
CREATE INDEX idx_access_tokens_endpoint ON access_tokens(legal_entity_endpoint_id);

-- ========================================
-- Add helpful comment
-- ========================================
COMMENT ON COLUMN m2m_clients.legal_entity_endpoint_id IS
  'Links M2M credential to a specific published endpoint. One endpoint can have multiple credentials.';

COMMENT ON COLUMN access_tokens.legal_entity_endpoint_id IS
  'Links legacy token to a specific published endpoint. One endpoint can have multiple credentials.';
