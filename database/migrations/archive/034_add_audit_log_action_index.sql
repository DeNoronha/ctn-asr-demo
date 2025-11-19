-- =====================================================
-- Migration 034: Add Index on audit_log.action Column
-- Date: November 17, 2025
-- Priority: MEDIUM
-- Expected Impact: 30-50% query performance improvement for action-filtered queries
-- =====================================================
--
-- PROBLEM:
-- The audit_log table is missing an index on the 'action' column, which is
-- frequently used in WHERE clauses when filtering audit logs by action type.
-- This causes full table scans for queries like:
--   SELECT * FROM audit_log WHERE action = 'CREATE_MEMBER'
--   SELECT * FROM audit_log WHERE action IN ('UPDATE_ENDPOINT', 'DELETE_ENDPOINT')
--
-- IMPACT:
-- - Audit log queries by action type are slower than necessary
-- - Performance degrades as audit_log table grows
-- - Dashboard queries showing recent actions by type are suboptimal
--
-- SOLUTION:
-- Add a B-tree index on audit_log.action column using CONCURRENTLY to avoid
-- table locking during index creation.
--
-- Note: No is_deleted filter needed as audit_log table does not have soft deletes
-- (audit logs are permanent for compliance)
--
-- =====================================================

-- =====================================================
-- Create index on action column
-- =====================================================

-- Create index CONCURRENTLY to avoid locking the table during creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action
  ON audit_log(action);

-- =====================================================
-- Performance Analysis
-- =====================================================

-- BEFORE (without index):
-- EXPLAIN ANALYZE SELECT * FROM audit_log WHERE action = 'CREATE_MEMBER';
-- Expected: Seq Scan on audit_log (cost=0.00..1000.00 rows=100 width=500)
-- Time: ~50-200ms depending on table size

-- AFTER (with index):
-- EXPLAIN ANALYZE SELECT * FROM audit_log WHERE action = 'CREATE_MEMBER';
-- Expected: Index Scan using idx_audit_log_action (cost=0.42..50.00 rows=100 width=500)
-- Time: ~5-20ms (50-80% improvement)

-- =====================================================
-- Common Use Cases Optimized
-- =====================================================

-- 1. Filter audit logs by specific action
-- SELECT * FROM audit_log WHERE action = 'UPDATE_MEMBER' ORDER BY dt_created DESC;

-- 2. Count actions by type
-- SELECT action, COUNT(*) FROM audit_log WHERE dt_created > NOW() - INTERVAL '7 days' GROUP BY action;

-- 3. Recent actions of specific types
-- SELECT * FROM audit_log WHERE action IN ('CREATE_MEMBER', 'UPDATE_MEMBER', 'DELETE_MEMBER') ORDER BY dt_created DESC LIMIT 50;

-- =====================================================
-- Index Statistics
-- =====================================================

-- Verify index was created
DO $$
DECLARE
  index_exists BOOLEAN;
  table_size TEXT;
  index_size TEXT;
BEGIN
  -- Check if index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'audit_log'
      AND indexname = 'idx_audit_log_action'
  ) INTO index_exists;

  IF index_exists THEN
    -- Get table and index sizes
    SELECT pg_size_pretty(pg_total_relation_size('audit_log')) INTO table_size;
    SELECT pg_size_pretty(pg_relation_size('idx_audit_log_action')) INTO index_size;

    RAISE NOTICE 'Migration 034 complete: idx_audit_log_action created successfully';
    RAISE NOTICE 'Table size: %, Index size: %', table_size, index_size;
    RAISE NOTICE 'Expected performance improvement: 30-50%% for action-filtered queries';
  ELSE
    RAISE WARNING 'Index idx_audit_log_action was not created';
  END IF;
END $$;

-- =====================================================
-- Rollback Procedure
-- =====================================================

-- To rollback this migration, run:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_action;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Verify index is being used (should show "Index Scan using idx_audit_log_action")
-- EXPLAIN SELECT * FROM audit_log WHERE action = 'CREATE_MEMBER';

-- Check index bloat (should be < 20% for healthy index)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
--   idx_scan AS index_scans,
--   idx_tup_read AS tuples_read,
--   idx_tup_fetch AS tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname = 'idx_audit_log_action';
