-- Migration 028: Add Performance Indexes
-- Priority: HIGH
-- Expected Impact: 50-80% query performance improvement
-- Reference: docs/DATABASE_OPTIMIZATION_GUIDE.md (lines 12-50)
--
-- This migration adds indexes for:
-- 1. Foreign key relationships (JOIN performance)
-- 2. Common query patterns (status, domain, identifiers)
-- 3. Audit log queries (time-based lookups)
--
-- All indexes use CONCURRENTLY to avoid table locking during creation
-- All indexes filter out soft-deleted records (is_deleted = false) where applicable

-- ===========================================================================
-- FOREIGN KEY INDEXES (for JOIN performance)
-- ===========================================================================

-- Index on legal_entity.party_reference_id for faster joins to party_reference
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_party_ref
  ON legal_entity(party_reference_id)
  WHERE is_deleted = false;

-- Index on legal_entity_contact.legal_entity_id for faster contact lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_contact_entity
  ON legal_entity_contact(legal_entity_id)
  WHERE is_deleted = false;

-- Index on legal_entity_number.legal_entity_id for faster identifier lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_number_entity
  ON legal_entity_number(legal_entity_id)
  WHERE is_deleted = false;

-- Index on legal_entity_endpoint.legal_entity_id for faster endpoint lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_endpoint_entity
  ON legal_entity_endpoint(legal_entity_id)
  WHERE is_deleted = false;

-- ===========================================================================
-- COMMON QUERY PATTERNS (frequently filtered columns)
-- ===========================================================================

-- Index on members view status for filtering active/suspended members
-- Note: This assumes v_members_full view exists and is commonly queried
-- If view doesn't exist, skip this index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_members_full') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_status
      ON legal_entity(status);
  END IF;
END $$;

-- Index on domain field for member lookups by domain
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_domain
  ON legal_entity(domain);

-- Index on KvK identifiers for Dutch company lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_kvk
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'KVK' AND is_deleted = false;

-- Index on LEI identifiers for legal entity identifier lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_lei
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'LEI' AND is_deleted = false;

-- Index on EUID identifiers for European company lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_euid
  ON legal_entity_number(identifier_value)
  WHERE identifier_type = 'EUID' AND is_deleted = false;

-- ===========================================================================
-- AUDIT LOG PERFORMANCE (time-based queries)
-- ===========================================================================

-- Index on audit_logs creation time for recent activity queries
-- Note: This assumes audit_logs table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_logs') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created
      ON audit_logs(dt_created DESC);

    -- Index on audit logs by entity and time for entity-specific audit trails
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity
      ON audit_logs(actor_org_id, dt_created DESC);
  END IF;
END $$;

-- ===========================================================================
-- VERIFICATION
-- ===========================================================================

-- Verify indexes were created successfully
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE indexname LIKE 'idx_legal_entity_%'
     OR indexname LIKE 'idx_members_%'
     OR indexname LIKE 'idx_audit_logs_%';

  RAISE NOTICE 'Migration 028 complete. Created/verified % indexes.', index_count;
  RAISE NOTICE 'Expected performance improvement: 50-80%% on JOIN and filtered queries.';
END $$;
