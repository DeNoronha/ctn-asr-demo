-- Migration 048: Database performance optimizations (2025-12-13)
-- Based on Database Expert (DE) agent analysis of query patterns in routes.ts
-- Estimated improvement: 30-50% for identifier lookups, 20-30% for contact authentication

-- ============================================================================
-- CRITICAL INDEX: Composite index for identifier lookups
-- Optimizes 17 occurrences of: WHERE legal_entity_id = $1 AND identifier_type = $2 AND is_deleted = false
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_number_entity_type_active
ON legal_entity_number (legal_entity_id, identifier_type)
WHERE is_deleted = false;

COMMENT ON INDEX idx_legal_entity_number_entity_type_active IS
'Composite index for frequent WHERE legal_entity_id = X AND identifier_type = Y queries (17 occurrences in API routes.ts)';

-- ============================================================================
-- CRITICAL INDEX: Composite index for contact authentication lookups
-- Optimizes: WHERE c.email = $1 AND c.is_active = true (authentication path)
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_legal_entity_contact_email_active
ON legal_entity_contact (email, is_active)
WHERE is_active = true AND is_deleted = false;

COMMENT ON INDEX idx_legal_entity_contact_email_active IS
'Composite index for authentication queries (email + is_active on critical path)';

-- ============================================================================
-- IMPORTANT INDEX: Composite index for DNS verification queries
-- Optimizes: WHERE legal_entity_id = $1 AND domain = $2 AND status = 'pending'
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_verification_entity_domain_status
ON dns_verification_tokens (legal_entity_id, domain, status)
WHERE status = 'pending';

COMMENT ON INDEX idx_dns_verification_entity_domain_status IS
'Composite index for DNS verification lookups (entity + domain + status)';

-- ============================================================================
-- IMPORTANT INDEX: FK index for identifier verification history
-- Optimizes JOINs from legal_entity_number to identifier_verification_history
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_verification_identifier_id
ON identifier_verification_history (identifier_id)
WHERE identifier_id IS NOT NULL;

COMMENT ON INDEX idx_verification_identifier_id IS
'FK index for joins from legal_entity_number to identifier_verification_history';

-- ============================================================================
-- CLEANUP: Remove duplicate constraint on legal_entity_number.verification_status
-- Two constraints existed: chk_validation_status_valid and legal_entity_number_verification_status_check
-- ============================================================================
ALTER TABLE legal_entity_number
DROP CONSTRAINT IF EXISTS legal_entity_number_verification_status_check;

-- ============================================================================
-- Analyze tables to update statistics after index creation
-- ============================================================================
ANALYZE legal_entity_number;
ANALYZE legal_entity_contact;
ANALYZE dns_verification_tokens;
ANALYZE identifier_verification_history;

-- ============================================================================
-- Verification queries (run manually to verify indexes were created)
-- ============================================================================
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'legal_entity_number';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'legal_entity_contact';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'dns_verification_tokens';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'identifier_verification_history';
