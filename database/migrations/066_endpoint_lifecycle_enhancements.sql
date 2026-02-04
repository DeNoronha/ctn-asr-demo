-- Migration 066: Endpoint Lifecycle Enhancements
-- Implements the 6-phase endpoint lifecycle per CTN specification
-- Adds: access_model, publication_status, published_at to endpoints
-- Creates: endpoint_access_request, endpoint_consumer_grant tables
-- Date: 2026-02-04

BEGIN;

-- ============================================================================
-- PHASE 1: Add columns to legal_entity_endpoint
-- ============================================================================

-- Add access_model column (controls who can request access)
-- Values: 'open' (auto-approve), 'restricted' (invite list), 'private' (manual approval)
ALTER TABLE public.legal_entity_endpoint
ADD COLUMN IF NOT EXISTS access_model VARCHAR(20) DEFAULT 'private';

-- Add publication_status column (controls visibility in directory)
-- Values: 'draft' (not visible), 'published' (discoverable), 'unpublished' (removed from directory)
ALTER TABLE public.legal_entity_endpoint
ADD COLUMN IF NOT EXISTS publication_status VARCHAR(20) DEFAULT 'draft';

-- Add published_at timestamp
ALTER TABLE public.legal_entity_endpoint
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add CHECK constraints for new columns
ALTER TABLE public.legal_entity_endpoint
ADD CONSTRAINT chk_access_model_valid
CHECK (access_model IN ('open', 'restricted', 'private'));

ALTER TABLE public.legal_entity_endpoint
ADD CONSTRAINT chk_publication_status_valid
CHECK (publication_status IN ('draft', 'published', 'unpublished'));

-- Add comments for new columns
COMMENT ON COLUMN public.legal_entity_endpoint.access_model IS
  'Access model: open (auto-approve all), restricted (invited consumers only), private (manual approval required)';

COMMENT ON COLUMN public.legal_entity_endpoint.publication_status IS
  'Publication status: draft (not visible), published (discoverable in directory), unpublished (removed from directory)';

COMMENT ON COLUMN public.legal_entity_endpoint.published_at IS
  'Timestamp when endpoint was first published to the directory';

-- ============================================================================
-- PHASE 2: Create endpoint_access_request table
-- Tracks consumer requests to access provider endpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.endpoint_access_request (
    access_request_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint_id UUID NOT NULL REFERENCES public.legal_entity_endpoint(legal_entity_endpoint_id) ON DELETE CASCADE,
    consumer_entity_id UUID NOT NULL REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE,
    provider_entity_id UUID NOT NULL REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Request status workflow: pending -> approved/denied, approved -> revoked
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Scopes requested and granted (may differ)
    requested_scopes TEXT[],
    approved_scopes TEXT[],

    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    decided_by VARCHAR(100),

    -- Denial/revocation info
    denial_reason TEXT,

    -- Standard audit columns
    dt_created TIMESTAMPTZ DEFAULT NOW(),
    dt_modified TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Constraints
    CONSTRAINT chk_access_request_status_valid
    CHECK (status IN ('pending', 'approved', 'denied', 'revoked'))
);

-- Comments
COMMENT ON TABLE public.endpoint_access_request IS
  'Tracks consumer requests to access provider endpoints. Part of CTN endpoint lifecycle Phase 4-5.';

COMMENT ON COLUMN public.endpoint_access_request.status IS
  'Request status: pending (awaiting decision), approved (access granted), denied (request rejected), revoked (access removed)';

COMMENT ON COLUMN public.endpoint_access_request.requested_scopes IS
  'Array of scope strings the consumer is requesting (e.g., read, write, admin)';

COMMENT ON COLUMN public.endpoint_access_request.approved_scopes IS
  'Array of scope strings actually granted (may be subset of requested)';

-- ============================================================================
-- PHASE 3: Create endpoint_consumer_grant table
-- Tracks active consumer grants with Keycloak M2M credentials
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.endpoint_consumer_grant (
    grant_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    access_request_id UUID REFERENCES public.endpoint_access_request(access_request_id) ON DELETE SET NULL,
    endpoint_id UUID NOT NULL REFERENCES public.legal_entity_endpoint(legal_entity_endpoint_id) ON DELETE CASCADE,
    consumer_entity_id UUID NOT NULL REFERENCES public.legal_entity(legal_entity_id) ON DELETE CASCADE,

    -- Keycloak M2M client info (issued when grant is created)
    keycloak_client_id VARCHAR(255),

    -- Granted scopes (copied from approved request)
    granted_scopes TEXT[],

    -- Grant lifecycle
    is_active BOOLEAN DEFAULT TRUE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(100),
    revocation_reason TEXT,

    -- Standard audit columns
    dt_created TIMESTAMPTZ DEFAULT NOW(),
    dt_modified TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE public.endpoint_consumer_grant IS
  'Active consumer grants to provider endpoints. Links to Keycloak M2M credentials. Part of CTN endpoint lifecycle Phase 5-6.';

COMMENT ON COLUMN public.endpoint_consumer_grant.keycloak_client_id IS
  'Keycloak client ID for M2M authentication. Consumer uses this to obtain tokens for API calls.';

COMMENT ON COLUMN public.endpoint_consumer_grant.granted_scopes IS
  'Array of scope strings the consumer has been granted';

-- ============================================================================
-- PHASE 4: Create indexes for common query patterns
-- ============================================================================

-- Indexes for endpoint_access_request
CREATE INDEX IF NOT EXISTS idx_access_request_endpoint_id
ON public.endpoint_access_request(endpoint_id)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_access_request_consumer_entity_id
ON public.endpoint_access_request(consumer_entity_id)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_access_request_provider_entity_id
ON public.endpoint_access_request(provider_entity_id)
WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_access_request_status
ON public.endpoint_access_request(status)
WHERE is_deleted = FALSE;

-- Composite index for provider viewing pending requests
CREATE INDEX IF NOT EXISTS idx_access_request_provider_pending
ON public.endpoint_access_request(provider_entity_id, status)
WHERE is_deleted = FALSE AND status = 'pending';

-- Indexes for endpoint_consumer_grant
CREATE INDEX IF NOT EXISTS idx_consumer_grant_endpoint_id
ON public.endpoint_consumer_grant(endpoint_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_consumer_grant_consumer_entity_id
ON public.endpoint_consumer_grant(consumer_entity_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_consumer_grant_keycloak_client
ON public.endpoint_consumer_grant(keycloak_client_id)
WHERE is_active = TRUE;

-- Index for finding published endpoints (directory queries)
CREATE INDEX IF NOT EXISTS idx_endpoint_published
ON public.legal_entity_endpoint(publication_status)
WHERE is_deleted = FALSE AND is_active = TRUE AND publication_status = 'published';

-- Composite index for directory with access model filtering
CREATE INDEX IF NOT EXISTS idx_endpoint_directory_query
ON public.legal_entity_endpoint(publication_status, access_model)
WHERE is_deleted = FALSE AND is_active = TRUE;

-- ============================================================================
-- PHASE 5: Create trigger to update dt_modified on endpoint_access_request
-- ============================================================================

CREATE OR REPLACE FUNCTION update_access_request_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_access_request_modified ON public.endpoint_access_request;

CREATE TRIGGER trg_access_request_modified
BEFORE UPDATE ON public.endpoint_access_request
FOR EACH ROW
EXECUTE FUNCTION update_access_request_modified_timestamp();

-- ============================================================================
-- PHASE 6: Create trigger to update dt_modified on endpoint_consumer_grant
-- ============================================================================

CREATE OR REPLACE FUNCTION update_consumer_grant_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consumer_grant_modified ON public.endpoint_consumer_grant;

CREATE TRIGGER trg_consumer_grant_modified
BEFORE UPDATE ON public.endpoint_consumer_grant
FOR EACH ROW
EXECUTE FUNCTION update_consumer_grant_modified_timestamp();

-- ============================================================================
-- PHASE 7: Unique constraint to prevent duplicate pending requests
-- ============================================================================

-- A consumer can only have one pending request per endpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request
ON public.endpoint_access_request(endpoint_id, consumer_entity_id)
WHERE is_deleted = FALSE AND status = 'pending';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- ============================================================================
--
-- -- Check new columns exist on legal_entity_endpoint
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'legal_entity_endpoint'
--   AND column_name IN ('access_model', 'publication_status', 'published_at');
--
-- -- Check new tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('endpoint_access_request', 'endpoint_consumer_grant');
--
-- -- Check indexes
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('endpoint_access_request', 'endpoint_consumer_grant', 'legal_entity_endpoint')
--   AND indexname LIKE 'idx_%';
--
-- -- Check constraints
-- SELECT conname, contype
-- FROM pg_constraint
-- WHERE conrelid = 'public.legal_entity_endpoint'::regclass
--   AND conname LIKE 'chk_%';
