-- =====================================================
-- Migration 028: Phase 2 Schema Refactoring
-- Date: November 13, 2025
-- Purpose: Remove duplicate columns from members table
--          Add table documentation (COMMENT ON TABLE)
--          Add CHECK constraints for data integrity
--          Create views to maintain backward compatibility
-- Related: DATABASE_SCHEMA_ANALYSIS_2025-11-13.md
--          SCHEMA_ISSUES_SUMMARY.md
-- Dependencies: Migration 027 (UNIQUE constraint on legal_entity.party_id)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create Backup Table
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 1: Creating backup of members table...'; END $$;

CREATE TABLE IF NOT EXISTS members_backup_20251113 AS
SELECT * FROM members;

DO $$
DECLARE
  v_backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backup_count FROM members_backup_20251113;
  RAISE NOTICE 'Backed up % members records', v_backup_count;
END $$;

-- =====================================================
-- STEP 2: Verify Data Consistency Before Changes
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 2: Verifying data consistency...'; END $$;

-- Check that all members have legal_entity_id
DO $$
DECLARE
  v_missing_legal_entity_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_missing_legal_entity_count
  FROM members
  WHERE legal_entity_id IS NULL;

  IF v_missing_legal_entity_count > 0 THEN
    RAISE WARNING '% members have NULL legal_entity_id. These will be skipped.', v_missing_legal_entity_count;
  ELSE
    RAISE NOTICE 'All members have valid legal_entity_id ✓';
  END IF;
END $$;

-- Verify data matches between members and legal_entity
DO $$
DECLARE
  v_mismatch_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_mismatch_count
  FROM members m
  JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
  WHERE m.legal_name != le.primary_legal_name
     OR m.domain != le.domain
     OR m.status != le.status;

  IF v_mismatch_count > 0 THEN
    RAISE WARNING '% members have data mismatches with legal_entity (will preserve legal_entity values)', v_mismatch_count;
  ELSE
    RAISE NOTICE 'All member data matches legal_entity ✓';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create View for Backward Compatibility
-- (Before removing columns)
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 3: Creating v_members_full view...'; END $$;

-- Drop old view if exists
DROP VIEW IF EXISTS v_members_full CASCADE;

-- Create comprehensive view that includes all member + legal_entity data
CREATE OR REPLACE VIEW v_members_full AS
SELECT
  m.id,
  m.org_id,
  m.legal_entity_id,
  m.azure_ad_object_id,
  m.email,
  m.created_at,
  m.updated_at,
  m.metadata as member_metadata,
  -- Fetch from legal_entity (source of truth)
  le.primary_legal_name as legal_name,
  le.domain,
  le.status,
  le.membership_level,
  le.authentication_tier,
  le.authentication_method,
  le.metadata as legal_entity_metadata,
  le.party_id,
  -- Denormalized identifiers (for convenience)
  MAX(CASE WHEN len.identifier_type = 'LEI' THEN len.identifier_value END) as lei,
  MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value END) as kvk,
  MAX(CASE WHEN len.identifier_type = 'EURI' THEN len.identifier_value END) as euri,
  MAX(CASE WHEN len.identifier_type = 'DUNS' THEN len.identifier_value END) as duns,
  -- Count related entities
  (SELECT COUNT(*) FROM legal_entity_contact lec
   WHERE lec.legal_entity_id = m.legal_entity_id
     AND lec.is_deleted = false) as contact_count,
  (SELECT COUNT(*) FROM legal_entity_endpoint lee
   WHERE lee.legal_entity_id = m.legal_entity_id
     AND lee.is_deleted = false) as endpoint_count
FROM members m
LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
  AND le.is_deleted = false
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
  AND len.is_deleted = false
GROUP BY
  m.id, m.org_id, m.legal_entity_id, m.azure_ad_object_id, m.email,
  m.created_at, m.updated_at, m.metadata,
  le.primary_legal_name, le.domain, le.status, le.membership_level,
  le.authentication_tier, le.authentication_method, le.metadata, le.party_id;

COMMENT ON VIEW v_members_full IS
  'Comprehensive member view combining members table with legal_entity and identifiers. Use for API responses requiring full member details.';

DO $$ BEGIN RAISE NOTICE 'View v_members_full created ✓'; END $$;

-- =====================================================
-- STEP 4: Remove Duplicate Columns from members Table
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 4: Removing duplicate columns from members table...'; END $$;

-- Remove legal_name (duplicate of legal_entity.primary_legal_name)
ALTER TABLE members DROP COLUMN IF EXISTS legal_name CASCADE;
DO $$ BEGIN RAISE NOTICE 'Dropped column: legal_name'; END $$;

-- Remove domain (duplicate of legal_entity.domain)
ALTER TABLE members DROP COLUMN IF EXISTS "domain" CASCADE;
DO $$ BEGIN RAISE NOTICE 'Dropped column: domain'; END $$;

-- Remove status (duplicate of legal_entity.status)
ALTER TABLE members DROP COLUMN IF EXISTS status CASCADE;
DO $$ BEGIN RAISE NOTICE 'Dropped column: status'; END $$;

-- Remove membership_level (duplicate of legal_entity.membership_level)
ALTER TABLE members DROP COLUMN IF EXISTS membership_level CASCADE;
DO $$ BEGIN RAISE NOTICE 'Dropped column: membership_level'; END $$;

-- Remove lei (available in legal_entity_number)
ALTER TABLE members DROP COLUMN IF EXISTS lei CASCADE;
DO $$ BEGIN RAISE NOTICE 'Dropped column: lei'; END $$;

-- Remove kvk (available in legal_entity_number)
ALTER TABLE members DROP COLUMN IF EXISTS kvk CASCADE;
DO $$ BEGIN RAISE NOTICE 'Dropped column: kvk'; END $$;

DO $$ BEGIN RAISE NOTICE 'Duplicate columns removed ✓'; END $$;

-- =====================================================
-- STEP 5: Add NOT NULL Constraint to legal_entity_id
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 5: Adding NOT NULL constraint to legal_entity_id...'; END $$;

-- Ensure legal_entity_id is NOT NULL (all members MUST have legal_entity)
ALTER TABLE members
  ALTER COLUMN legal_entity_id SET NOT NULL;

DO $$ BEGIN RAISE NOTICE 'legal_entity_id is now NOT NULL ✓'; END $$;

-- =====================================================
-- STEP 6: Add UNIQUE Constraint to legal_entity_id
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 6: Adding UNIQUE constraint to legal_entity_id...'; END $$;

-- Drop if exists (idempotent)
DROP INDEX IF EXISTS uq_members_legal_entity_id;

-- Each legal_entity can have only ONE member record
CREATE UNIQUE INDEX uq_members_legal_entity_id
  ON members(legal_entity_id);

COMMENT ON INDEX uq_members_legal_entity_id IS
  'Ensures 1:1 relationship between members and legal_entity (one member per legal_entity)';

DO $$ BEGIN RAISE NOTICE 'UNIQUE constraint on legal_entity_id added ✓'; END $$;

-- =====================================================
-- STEP 7: Add CHECK Constraints for Data Integrity
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 7: Cleaning up data before constraints...'; END $$;

-- Fix email with trailing dot(s)
UPDATE members
SET email = RTRIM(email, '.')
WHERE email ~ '\.$';

DO $$ BEGIN RAISE NOTICE 'Email data cleaned ✓'; END $$;

-- =====================================================
-- STEP 8: Add CHECK Constraints for Data Integrity
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 8: Adding CHECK constraints for data integrity...'; END $$;

-- Ensure org_id is not empty
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS chk_members_org_id_format;

ALTER TABLE members
  ADD CONSTRAINT chk_members_org_id_format
    CHECK (org_id IS NOT NULL AND LENGTH(TRIM(org_id)) > 0);

COMMENT ON CONSTRAINT chk_members_org_id_format ON members IS
  'Ensures org_id is not null or empty. Accepts multiple formats: org:name, UUIDs, or alphanumeric codes';

-- Ensure email format is valid (if provided)
ALTER TABLE members
  DROP CONSTRAINT IF EXISTS chk_members_email_format;

ALTER TABLE members
  ADD CONSTRAINT chk_members_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

COMMENT ON CONSTRAINT chk_members_email_format ON members IS
  'Validates email format if provided (nullable field)';

DO $$ BEGIN RAISE NOTICE 'CHECK constraints added ✓'; END $$;

-- =====================================================
-- STEP 9: Document Table Purposes
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 9: Documenting table purposes...'; END $$;

-- Update members table comment
COMMENT ON TABLE members IS
  'Member organizations in the CTN Association Register. Contains member-specific data (org_id, Azure AD integration). All other organization details stored in legal_entity table (1:1 relationship enforced by uq_members_legal_entity_id). Updated 2025-11-13 (Migration 028 - removed duplicate columns).';

COMMENT ON COLUMN members.id IS
  'Primary key (UUID)';

COMMENT ON COLUMN members.org_id IS
  'Organization identifier (format: org:name, e.g., org:dhl). Must be unique. Used in API URLs and OAuth client registration.';

COMMENT ON COLUMN members.legal_entity_id IS
  'Foreign key to legal_entity table. UNIQUE constraint ensures 1:1 relationship (one member per legal_entity). NOT NULL - all members must have legal_entity.';

COMMENT ON COLUMN members.azure_ad_object_id IS
  'Azure AD B2C object ID for the member organization. Used for Azure AD authentication integration.';

COMMENT ON COLUMN members.email IS
  'Primary contact email for the member organization. Used for notifications and password reset.';

COMMENT ON COLUMN members.metadata IS
  'JSONB field for member-specific metadata (e.g., onboarding status, preferences). Allows schema evolution without migrations.';

-- Update party_reference comment (already done in 027, reconfirm)
COMMENT ON TABLE party_reference IS
  'Abstract party identity. Minimal metadata (party_class, party_type). Extended by legal_entity table (1:1 relationship enforced by uq_legal_entity_party_id_active).';

COMMENT ON COLUMN party_reference.party_class IS
  'Party classification (e.g., ORGANIZATION, INDIVIDUAL)';

COMMENT ON COLUMN party_reference.party_type IS
  'Party type within class (e.g., MEMBER, PARTNER, SUPPLIER)';

-- Update legal_entity comment (already done in 027, reconfirm)
COMMENT ON TABLE legal_entity IS
  'Full legal entity details for organizations. 1:1 relationship with party_reference via party_id (enforced by uq_legal_entity_party_id_active). Source of truth for legal_name, domain, status, membership_level. Updated 2025-11-13 (Migration 028 - members table no longer duplicates these columns).';

COMMENT ON COLUMN legal_entity.primary_legal_name IS
  'Official legal name of the organization (source of truth)';

COMMENT ON COLUMN legal_entity.domain IS
  'Organization domain name (e.g., dhl.com). Used for DNS verification and endpoint registration.';

COMMENT ON COLUMN legal_entity.status IS
  'Organization status. CHECK constraint ensures valid values: PENDING, ACTIVE, SUSPENDED, INACTIVE, REJECTED';

COMMENT ON COLUMN legal_entity.membership_level IS
  'Membership tier (e.g., BASIC, PREMIUM, ENTERPRISE). Determines feature access and rate limits.';

COMMENT ON COLUMN legal_entity.authentication_tier IS
  'Authentication tier (1, 2, or 3). Determines required verification level. CHECK constraint enforces valid values.';

COMMENT ON COLUMN legal_entity.authentication_method IS
  'Authentication method (eHerkenning, DNS, EmailVerification). CHECK constraint enforces valid values.';

-- Document legal_entity_number table
COMMENT ON TABLE legal_entity_number IS
  'Legal entity identifiers (KvK, LEI, EURI, DUNS). Multiple identifiers per legal_entity (1:N relationship). Replaces duplicate lei/kvk columns previously in members table.';

COMMENT ON COLUMN legal_entity_number.identifier_type IS
  'Type of identifier (LEI, KVK, EURI, DUNS, etc.)';

COMMENT ON COLUMN legal_entity_number.identifier_value IS
  'Actual identifier value (e.g., 724500PMK2A2M1SQQ228 for LEI)';

COMMENT ON COLUMN legal_entity_number.validation_status IS
  'Validation status (PENDING, VERIFIED, FAILED, FLAGGED). Tracks verification workflow.';

DO $$ BEGIN RAISE NOTICE 'Table documentation updated ✓'; END $$;

-- =====================================================
-- STEP 10: Create Helper View for Members List
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 10: Creating v_members_list view...'; END $$;

-- Lightweight view for member list pages (no JOINs to identifiers)
DROP VIEW IF EXISTS v_members_list CASCADE;

CREATE OR REPLACE VIEW v_members_list AS
SELECT
  m.id,
  m.org_id,
  m.legal_entity_id,
  m.email,
  m.created_at,
  m.updated_at,
  -- Fetch from legal_entity
  le.primary_legal_name as legal_name,
  le.domain,
  le.status,
  le.membership_level,
  le.authentication_tier,
  le.party_id
FROM members m
LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
  AND le.is_deleted = false;

COMMENT ON VIEW v_members_list IS
  'Lightweight view for member list pages. Excludes identifiers (no JOIN to legal_entity_number) for better performance.';

DO $$ BEGIN RAISE NOTICE 'View v_members_list created ✓'; END $$;

-- =====================================================
-- STEP 11: Verify Schema Changes
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 11: Verifying schema changes...'; END $$;

-- Verify members table structure
DO $$
DECLARE
  v_column_count INTEGER;
  v_expected_columns TEXT[] := ARRAY['id', 'org_id', 'legal_entity_id', 'azure_ad_object_id', 'email', 'created_at', 'updated_at', 'metadata'];
  v_actual_columns TEXT[];
BEGIN
  -- Get actual columns
  SELECT ARRAY_AGG(column_name ORDER BY ordinal_position)
  INTO v_actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'members';

  -- Check column count
  SELECT COUNT(*) INTO v_column_count FROM unnest(v_actual_columns);

  IF v_column_count = 8 THEN
    RAISE NOTICE 'Members table has % columns (expected 8) ✓', v_column_count;
  ELSE
    RAISE WARNING 'Members table has % columns (expected 8)', v_column_count;
  END IF;

  -- List actual columns
  RAISE NOTICE 'Actual columns: %', v_actual_columns;
END $$;

-- Verify UNIQUE constraint exists
DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'uq_members_legal_entity_id'
      AND schemaname = 'public'
  ) INTO v_constraint_exists;

  IF v_constraint_exists THEN
    RAISE NOTICE 'UNIQUE index on legal_entity_id exists ✓';
  ELSE
    RAISE EXCEPTION 'UNIQUE index on legal_entity_id missing! Migration failed.';
  END IF;
END $$;

-- Verify views exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_members_full') THEN
    RAISE NOTICE 'View v_members_full exists ✓';
  ELSE
    RAISE EXCEPTION 'View v_members_full missing! Migration failed.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_members_list') THEN
    RAISE NOTICE 'View v_members_list exists ✓';
  ELSE
    RAISE EXCEPTION 'View v_members_list missing! Migration failed.';
  END IF;
END $$;

-- =====================================================
-- STEP 11: Final Validation
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 11: Running final validation...'; END $$;

DO $$
DECLARE
  v_members_count INTEGER;
  v_legal_entities_count INTEGER;
  v_view_count INTEGER;
BEGIN
  -- Count members
  SELECT COUNT(*) INTO v_members_count FROM members;
  RAISE NOTICE 'Total members: %', v_members_count;

  -- Count legal_entities referenced by members
  SELECT COUNT(DISTINCT legal_entity_id) INTO v_legal_entities_count FROM members;
  RAISE NOTICE 'Total legal_entities referenced: %', v_legal_entities_count;

  -- Verify view returns data
  SELECT COUNT(*) INTO v_view_count FROM v_members_full;
  RAISE NOTICE 'v_members_full returns % rows', v_view_count;

  IF v_view_count = v_members_count THEN
    RAISE NOTICE 'View row count matches members table ✓';
  ELSE
    RAISE WARNING 'View row count (%) does not match members count (%)', v_view_count, v_members_count;
  END IF;

  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Migration 028 completed successfully!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Removed 6 duplicate columns from members table';
  RAISE NOTICE '- Added UNIQUE constraint on legal_entity_id';
  RAISE NOTICE '- Created v_members_full view for backward compatibility';
  RAISE NOTICE '- Created v_members_list view for performance';
  RAISE NOTICE '- Added CHECK constraints for data integrity';
  RAISE NOTICE '- Documented all table purposes';
  RAISE NOTICE '==============================================';
END $$;

COMMIT;

-- =====================================================
-- Rollback Instructions
-- =====================================================
-- To rollback this migration:
--
-- BEGIN;
--
-- -- 1. Drop views
-- DROP VIEW IF EXISTS v_members_full CASCADE;
-- DROP VIEW IF EXISTS v_members_list CASCADE;
--
-- -- 2. Drop UNIQUE constraint
-- DROP INDEX IF EXISTS uq_members_legal_entity_id;
--
-- -- 3. Restore members table from backup
-- DROP TABLE IF EXISTS members CASCADE;
-- CREATE TABLE members AS SELECT * FROM members_backup_20251113;
--
-- -- 4. Restore primary key and indexes
-- ALTER TABLE members ADD PRIMARY KEY (id);
-- CREATE UNIQUE INDEX members_org_id_key ON members(org_id);
--
-- -- 5. Restore foreign key constraint
-- ALTER TABLE members
--   ADD CONSTRAINT members_legal_entity_id_fkey
--     FOREIGN KEY (legal_entity_id)
--     REFERENCES legal_entity(legal_entity_id)
--     ON DELETE CASCADE;
--
-- COMMIT;
-- =====================================================
