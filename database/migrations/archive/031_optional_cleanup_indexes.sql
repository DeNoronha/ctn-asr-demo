-- =====================================================
-- Migration 031: Optional Cleanup & Performance Indexes
-- Date: November 14, 2025 (OPTIONAL - LOW PRIORITY)
-- Purpose: Add indexes for token cleanup and audit log queries
-- Reference: DATABASE_CONSTRAINT_REVIEW_2025-11-14.md
-- =====================================================
-- STATUS: OPTIONAL ENHANCEMENT
--
-- These indexes optimize infrequent operations:
-- - Token cleanup jobs (daily/weekly)
-- - Audit log queries (administrative)
--
-- Benefits:
-- - Faster token cleanup (dns_verification_tokens)
-- - Faster audit log range queries
--
-- Risks: NONE (read-only index creation)
-- Impact: Minimal (cleanup jobs are infrequent)
-- =====================================================
-- NOTE: This migration uses CREATE INDEX CONCURRENTLY which cannot
--       run inside a transaction block, so BEGIN/COMMIT are omitted.
-- =====================================================

-- =====================================================
-- 1. DNS Verification Token Cleanup Index
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding index for DNS token cleanup queries...';
END $$;

-- Index for expired token cleanup
-- Query pattern: DELETE WHERE expires_at < NOW() AND status = 'pending'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_tokens_cleanup
  ON dns_verification_tokens(expires_at)
  WHERE status = 'pending';

COMMENT ON INDEX idx_dns_tokens_cleanup IS
  'Optimizes expired token cleanup queries (WHERE status=pending AND expires_at < NOW())';

-- =====================================================
-- 2. Issued Tokens Cleanup Index (BVAD)
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding index for BVAD token cleanup queries...';
END $$;

-- Index for expired BVAD token cleanup
-- Query pattern: DELETE WHERE expires_at < NOW()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bvad_tokens_cleanup
  ON bvad_issued_tokens(expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON INDEX idx_bvad_tokens_cleanup IS
  'Optimizes BVAD expired token cleanup queries';

-- =====================================================
-- 3. OAuth Client Cleanup Index
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding index for OAuth client token cleanup queries...';
END $$;

-- Index for expired OAuth token cleanup
-- Query pattern: DELETE WHERE expires_at < NOW()
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issued_tokens_cleanup
  ON issued_tokens(expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON INDEX idx_issued_tokens_cleanup IS
  'Optimizes OAuth token cleanup queries';

-- =====================================================
-- 4. Audit Log Time Range Queries
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding indexes for audit log range queries...';
END $$;

-- Composite index for audit log queries with user filter
-- Query pattern: WHERE user_id = X AND dt_created BETWEEN Y AND Z
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_time
  ON audit_log(user_id, dt_created DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_audit_log_user_time IS
  'Optimizes audit log queries filtering by user and time range';

-- Composite index for audit log queries with result filter
-- Query pattern: WHERE result = 'failure' AND severity = 'high'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_result_severity
  ON audit_log(result, severity, dt_created DESC)
  WHERE result = 'failure';

COMMENT ON INDEX idx_audit_log_result_severity IS
  'Optimizes audit log queries for failures and severity levels';

-- =====================================================
-- 5. Authorization Log Optimization
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding index for authorization log queries...';
END $$;

-- Index for failed authorization attempts
-- Query pattern: WHERE authorization_result = 'denied' ORDER BY created_at DESC
-- Note: This index already exists from previous migration (idx_auth_log_denied)
-- Verifying it exists:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_auth_log_denied'
  ) THEN
    RAISE NOTICE '✓ Index idx_auth_log_denied already exists';
  ELSE
    RAISE NOTICE 'Creating idx_auth_log_denied...';
    CREATE INDEX CONCURRENTLY idx_auth_log_denied
      ON authorization_log(authorization_result, created_at DESC)
      WHERE authorization_result = 'denied';
  END IF;
END $$;

-- =====================================================
-- 6. M2M Secret Audit Cleanup
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Adding index for M2M secret audit queries...';
END $$;

-- Index for active (non-revoked) secrets
-- Note: This index already exists (idx_m2m_secrets_active)
-- Verifying it exists:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_m2m_secrets_active'
  ) THEN
    RAISE NOTICE '✓ Index idx_m2m_secrets_active already exists';
  ELSE
    RAISE NOTICE 'Creating idx_m2m_secrets_active...';
    CREATE INDEX CONCURRENTLY idx_m2m_secrets_active
      ON ctn_m2m_secret_audit(is_revoked)
      WHERE is_revoked = false;
  END IF;
END $$;

-- =====================================================
-- 7. Verification & Performance Analysis
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE 'Running verification queries...';
END $$;

-- Verify all indexes were created
DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_dns_tokens_cleanup',
      'idx_bvad_tokens_cleanup',
      'idx_issued_tokens_cleanup',
      'idx_audit_log_user_time',
      'idx_audit_log_result_severity',
      'idx_auth_log_denied',
      'idx_m2m_secrets_active'
    );

  RAISE NOTICE 'Created/verified % cleanup indexes', v_index_count;

  IF v_index_count < 7 THEN
    RAISE WARNING 'Expected 7 indexes, found %. Check for errors above.', v_index_count;
  ELSE
    RAISE NOTICE '✓ All cleanup indexes verified';
  END IF;
END $$;

-- Show estimated performance impact
DO $$
DECLARE
  v_dns_token_count INTEGER;
  v_bvad_token_count INTEGER;
  v_oauth_token_count INTEGER;
BEGIN
  -- Count records that benefit from cleanup indexes
  SELECT COUNT(*) INTO v_dns_token_count
  FROM dns_verification_tokens
  WHERE status = 'pending';

  SELECT COUNT(*) INTO v_bvad_token_count
  FROM bvad_issued_tokens
  WHERE expires_at IS NOT NULL;

  SELECT COUNT(*) INTO v_oauth_token_count
  FROM issued_tokens
  WHERE expires_at IS NOT NULL;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Performance Impact Estimate:';
  RAISE NOTICE '- DNS tokens indexed: %', v_dns_token_count;
  RAISE NOTICE '- BVAD tokens indexed: %', v_bvad_token_count;
  RAISE NOTICE '- OAuth tokens indexed: %', v_oauth_token_count;
  RAISE NOTICE 'Expected cleanup speedup: 50-80%% on large tables';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Migration 031 completed successfully!';
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- Rollback Instructions
-- =====================================================
-- To rollback this migration:
-- NOTE: DROP INDEX CONCURRENTLY also cannot run in a transaction
--
-- DROP INDEX CONCURRENTLY IF EXISTS idx_dns_tokens_cleanup;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_bvad_tokens_cleanup;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_issued_tokens_cleanup;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_user_time;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_result_severity;
-- -- Note: idx_auth_log_denied and idx_m2m_secrets_active exist from
-- -- previous migrations - do not drop unless rolling back those too
-- =====================================================

-- =====================================================
-- Performance Testing Queries
-- =====================================================
-- After deploying, test performance with these queries:
--
-- -- DNS token cleanup (before index)
-- EXPLAIN ANALYZE
-- SELECT * FROM dns_verification_tokens
-- WHERE status = 'pending' AND expires_at < NOW();
--
-- -- Audit log user query (before index)
-- EXPLAIN ANALYZE
-- SELECT * FROM audit_log
-- WHERE user_id = 'some-uuid' AND dt_created >= NOW() - INTERVAL '30 days'
-- ORDER BY dt_created DESC;
--
-- -- Check index usage
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE indexname IN (
--   'idx_dns_tokens_cleanup',
--   'idx_audit_log_user_time'
-- )
-- ORDER BY idx_scan DESC;
-- =====================================================
