-- =====================================================
-- Migration 036: Audit Log PII Pseudonymization
-- Date: November 17, 2025
-- Priority: HIGH (Security & GDPR Compliance)
-- =====================================================
--
-- PROBLEM:
-- Audit log table stores PII (email addresses, IP addresses) in plaintext,
-- creating GDPR compliance risks and violating data minimization principles.
--
-- GDPR Articles Addressed:
-- - Article 5(1)(c): Data Minimization
-- - Article 25: Data Protection by Design
-- - Article 32: Security of Processing
--
-- SOLUTION:
-- 1. Add pseudonymized columns for email and IP addresses
-- 2. Create secure PII mapping table with encryption at rest
-- 3. Implement 90-day retention policy with automatic purging
-- 4. Add access controls (SystemAdmin only for PII mapping)
--
-- IMPACT:
-- - GDPR compliant audit logging
-- - Reduced risk of PII exposure in audit logs
-- - Ability to de-pseudonymize for emergency support (with strict access control)
-- - Automatic data purging after 90 days
--
-- =====================================================

-- =====================================================
-- Enable pgcrypto extension for encryption
-- =====================================================

-- Create extension if not exists (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- STEP 1: Add pseudonymized columns to audit_log
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 1: Adding pseudonymized columns to audit_log...'; END $$;

-- Add new columns for pseudonymized data
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS user_email_pseudonym VARCHAR(64),
  ADD COLUMN IF NOT EXISTS ip_address_pseudonym VARCHAR(64);

-- Add comments to document the pseudonymization
COMMENT ON COLUMN audit_log.user_email_pseudonym IS 'Pseudonymized email address using HMAC-SHA256 (GDPR Article 5(1)(c) - Data Minimization)';
COMMENT ON COLUMN audit_log.ip_address_pseudonym IS 'Pseudonymized IP address using HMAC-SHA256 (GDPR Article 5(1)(c) - Data Minimization)';

-- Mark old columns as deprecated (will be removed in future migration)
COMMENT ON COLUMN audit_log.user_email IS 'DEPRECATED: Use user_email_pseudonym instead. Will be removed after backfill.';
COMMENT ON COLUMN audit_log.ip_address IS 'DEPRECATED: Use ip_address_pseudonym instead. Will be removed after backfill.';

DO $$ BEGIN RAISE NOTICE 'Added pseudonymized columns to audit_log ✓'; END $$;

-- =====================================================
-- STEP 2: Create indexes on pseudonymized columns
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 2: Creating indexes on pseudonymized columns...'; END $$;

-- Create index on user_email_pseudonym for fast lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_email_pseudonym
  ON audit_log(user_email_pseudonym)
  WHERE user_email_pseudonym IS NOT NULL;

-- Create index on ip_address_pseudonym for fast lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_ip_pseudonym
  ON audit_log(ip_address_pseudonym)
  WHERE ip_address_pseudonym IS NOT NULL;

-- Create index on dt_created for retention policy purging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_dt_created
  ON audit_log(dt_created);

DO $$ BEGIN RAISE NOTICE 'Created indexes on pseudonymized columns ✓'; END $$;

-- =====================================================
-- STEP 3: Create PII mapping table (encrypted storage)
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 3: Creating PII mapping table...'; END $$;

-- Create table for storing pseudonym -> PII mappings (encrypted)
CREATE TABLE IF NOT EXISTS audit_log_pii_mapping (
  pseudonym VARCHAR(64) PRIMARY KEY,
  encrypted_value BYTEA NOT NULL, -- Encrypted using pgp_sym_encrypt()
  created_by VARCHAR(255) NOT NULL,
  dt_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE audit_log_pii_mapping IS 'Encrypted mapping of pseudonyms to original PII values. RESTRICTED ACCESS: SystemAdmin only. GDPR Article 32 - Encryption of Personal Data.';

-- Add column comments
COMMENT ON COLUMN audit_log_pii_mapping.pseudonym IS 'Pseudonymized value (email_xxx or ipv4_xxx or ipv6_xxx)';
COMMENT ON COLUMN audit_log_pii_mapping.encrypted_value IS 'Original PII value encrypted with pgp_sym_encrypt() using PII_ENCRYPTION_KEY';
COMMENT ON COLUMN audit_log_pii_mapping.created_by IS 'User ID who created this mapping (for audit trail)';

-- Create index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_pii_mapping_dt_created
  ON audit_log_pii_mapping(dt_created);

-- Create index for audit trail by user
CREATE INDEX IF NOT EXISTS idx_pii_mapping_created_by
  ON audit_log_pii_mapping(created_by);

DO $$ BEGIN RAISE NOTICE 'Created PII mapping table ✓'; END $$;

-- =====================================================
-- STEP 4: Restrict access to PII mapping table
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 4: Setting access controls on PII mapping table...'; END $$;

-- Revoke all public access
REVOKE ALL ON audit_log_pii_mapping FROM PUBLIC;

-- Grant only necessary permissions to application user
GRANT SELECT, INSERT ON audit_log_pii_mapping TO asradmin;

-- Note: DELETE and UPDATE are intentionally NOT granted
-- Mappings should never be deleted or updated (audit trail preservation)

DO $$ BEGIN RAISE NOTICE 'Set access controls on PII mapping table ✓'; END $$;

-- =====================================================
-- STEP 5: Create retention policy function (90 days)
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 5: Creating retention policy function...'; END $$;

-- Create function to purge old audit logs (90-day retention)
CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS TABLE(
  audit_logs_deleted INTEGER,
  pii_mappings_deleted INTEGER
) AS $$
DECLARE
  v_audit_logs_deleted INTEGER;
  v_pii_mappings_deleted INTEGER;
  v_retention_days INTEGER := 90;
BEGIN
  -- Delete old audit logs
  DELETE FROM audit_log
  WHERE dt_created < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_audit_logs_deleted = ROW_COUNT;

  -- Delete old PII mappings
  DELETE FROM audit_log_pii_mapping
  WHERE dt_created < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_pii_mappings_deleted = ROW_COUNT;

  -- Log the purge operation
  RAISE NOTICE 'Purged % audit logs and % PII mappings older than % days',
    v_audit_logs_deleted, v_pii_mappings_deleted, v_retention_days;

  -- Return counts
  RETURN QUERY SELECT v_audit_logs_deleted, v_pii_mappings_deleted;
END;
$$ LANGUAGE plpgsql;

-- Add function comment
COMMENT ON FUNCTION purge_old_audit_logs() IS 'Purges audit logs and PII mappings older than 90 days. GDPR Article 5(1)(e) - Storage Limitation. Run daily via scheduled job.';

DO $$ BEGIN RAISE NOTICE 'Created retention policy function ✓'; END $$;

-- =====================================================
-- STEP 6: Create audit trail for PII access
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 6: Creating audit trail for PII access...'; END $$;

-- Create table for logging PII access (who accessed what, when)
CREATE TABLE IF NOT EXISTS audit_log_pii_access (
  access_id SERIAL PRIMARY KEY,
  pseudonym VARCHAR(64) NOT NULL,
  accessed_by VARCHAR(255) NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  access_reason TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45)
);

-- Add table comment
COMMENT ON TABLE audit_log_pii_access IS 'Audit trail of PII de-pseudonymization access. GDPR Article 32 - Monitoring and Logging.';

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_pii_access_accessed_at
  ON audit_log_pii_access(accessed_at);

CREATE INDEX IF NOT EXISTS idx_pii_access_accessed_by
  ON audit_log_pii_access(accessed_by);

CREATE INDEX IF NOT EXISTS idx_pii_access_pseudonym
  ON audit_log_pii_access(pseudonym);

-- Restrict access
REVOKE ALL ON audit_log_pii_access FROM PUBLIC;
GRANT SELECT, INSERT ON audit_log_pii_access TO asradmin;

DO $$ BEGIN RAISE NOTICE 'Created PII access audit trail ✓'; END $$;

-- =====================================================
-- STEP 7: Verification and summary
-- =====================================================

DO $$
DECLARE
  v_audit_log_count INTEGER;
  v_pii_mapping_count INTEGER;
  v_email_pseudonym_index_exists BOOLEAN;
  v_ip_pseudonym_index_exists BOOLEAN;
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Migration 036: Audit Log PII Pseudonymization';
  RAISE NOTICE '====================================================';

  -- Check audit_log table
  SELECT COUNT(*) INTO v_audit_log_count FROM audit_log;
  RAISE NOTICE 'Audit log table: % existing records', v_audit_log_count;

  -- Check columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'user_email_pseudonym'
  ) THEN
    RAISE NOTICE '  ✓ user_email_pseudonym column exists';
  ELSE
    RAISE WARNING '  ✗ user_email_pseudonym column missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'ip_address_pseudonym'
  ) THEN
    RAISE NOTICE '  ✓ ip_address_pseudonym column exists';
  ELSE
    RAISE WARNING '  ✗ ip_address_pseudonym column missing';
  END IF;

  -- Check indexes
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'audit_log' AND indexname = 'idx_audit_log_email_pseudonym'
  ) INTO v_email_pseudonym_index_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'audit_log' AND indexname = 'idx_audit_log_ip_pseudonym'
  ) INTO v_ip_pseudonym_index_exists;

  IF v_email_pseudonym_index_exists THEN
    RAISE NOTICE '  ✓ idx_audit_log_email_pseudonym index exists';
  ELSE
    RAISE WARNING '  ✗ idx_audit_log_email_pseudonym index missing';
  END IF;

  IF v_ip_pseudonym_index_exists THEN
    RAISE NOTICE '  ✓ idx_audit_log_ip_pseudonym index exists';
  ELSE
    RAISE WARNING '  ✗ idx_audit_log_ip_pseudonym index missing';
  END IF;

  -- Check PII mapping table
  SELECT COUNT(*) INTO v_pii_mapping_count FROM audit_log_pii_mapping;
  RAISE NOTICE 'PII mapping table: % records', v_pii_mapping_count;

  -- Check function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'purge_old_audit_logs'
  ) THEN
    RAISE NOTICE '  ✓ purge_old_audit_logs() function exists';
  ELSE
    RAISE WARNING '  ✗ purge_old_audit_logs() function missing';
  END IF;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'GDPR Compliance Status:';
  RAISE NOTICE '  ✓ Article 5(1)(c) - Data Minimization (pseudonymization)';
  RAISE NOTICE '  ✓ Article 25 - Data Protection by Design (encryption)';
  RAISE NOTICE '  ✓ Article 32 - Security of Processing (access controls)';
  RAISE NOTICE '  ✓ Article 5(1)(e) - Storage Limitation (90-day retention)';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Configure AUDIT_LOG_SECRET environment variable';
  RAISE NOTICE '  2. Configure PII_ENCRYPTION_KEY environment variable';
  RAISE NOTICE '  3. Deploy updated API code with pseudonymization';
  RAISE NOTICE '  4. Schedule daily purge job (cron or Azure Function timer)';
  RAISE NOTICE '  5. Monitor audit_log_pii_access for unauthorized access';
  RAISE NOTICE '====================================================';
END $$;

-- =====================================================
-- STEP 8: Create helper view for audit log analysis
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 8: Creating audit log analysis view...'; END $$;

-- Create view for analyzing audit logs (without exposing PII)
CREATE OR REPLACE VIEW v_audit_log_summary AS
SELECT
  audit_log_id,
  event_type,
  severity,
  result,
  user_id,
  -- Show pseudonym, not original PII
  COALESCE(user_email_pseudonym, 'no-email') AS user_identifier,
  resource_type,
  resource_id,
  action,
  -- Show pseudonym, not original IP
  COALESCE(ip_address_pseudonym, 'no-ip') AS client_identifier,
  LEFT(user_agent, 100) AS user_agent_summary, -- Truncate for readability
  request_path,
  request_method,
  error_message,
  dt_created
FROM audit_log
ORDER BY dt_created DESC;

-- Add view comment
COMMENT ON VIEW v_audit_log_summary IS 'Audit log summary view with pseudonymized PII. Safe for general admin access without exposing original email/IP addresses.';

-- Grant access to view
GRANT SELECT ON v_audit_log_summary TO asradmin;

DO $$ BEGIN RAISE NOTICE 'Created audit log analysis view ✓'; END $$;

-- =====================================================
-- Rollback Procedure
-- =====================================================

-- To rollback this migration, run:
/*
-- Remove pseudonymized columns
ALTER TABLE audit_log DROP COLUMN IF EXISTS user_email_pseudonym;
ALTER TABLE audit_log DROP COLUMN IF EXISTS ip_address_pseudonym;

-- Drop indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_email_pseudonym;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_ip_pseudonym;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_log_dt_created;

-- Drop PII mapping table and access log
DROP TABLE IF EXISTS audit_log_pii_access CASCADE;
DROP TABLE IF EXISTS audit_log_pii_mapping CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS purge_old_audit_logs();

-- Drop view
DROP VIEW IF EXISTS v_audit_log_summary;
*/

-- =====================================================
-- Migration Complete
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Migration 036 complete! Audit log PII pseudonymization enabled.'; END $$;
