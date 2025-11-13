-- =====================================================
-- Migration 027: Fix Duplicate legal_entity Records
-- Date: November 13, 2025
-- Purpose: Clean up duplicate legal_entity records per party_id
--          Add UNIQUE constraint to prevent future duplicates
--          Fix v_m2m_credentials_active view to handle edge cases
-- Related: DATABASE_SCHEMA_ANALYSIS_2025-11-13.md
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create Backup Table
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 1: Creating backup table...'; END $$;

CREATE TABLE IF NOT EXISTS legal_entity_backup_20251113 AS
SELECT * FROM legal_entity
WHERE party_id IN (
  SELECT party_id
  FROM legal_entity
  WHERE is_deleted = false
  GROUP BY party_id
  HAVING COUNT(*) > 1
);

DO $$
DECLARE
  v_backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backup_count FROM legal_entity_backup_20251113;
  RAISE NOTICE 'Backed up % legal_entity records', v_backup_count;
END $$;

-- =====================================================
-- STEP 2: Identify Canonical legal_entity per party
-- Strategy: Keep the legal_entity referenced by members table
-- If no member reference, keep the most recent (dt_created DESC)
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 2: Identifying canonical legal_entity records...'; END $$;

CREATE TEMP TABLE canonical_legal_entities AS
WITH duplicate_parties AS (
  SELECT
    party_id,
    COUNT(*) as duplicate_count
  FROM legal_entity
  WHERE is_deleted = false
  GROUP BY party_id
  HAVING COUNT(*) > 1
)
SELECT DISTINCT ON (le.party_id)
  le.party_id,
  le.legal_entity_id as canonical_id,
  le.primary_legal_name,
  CASE
    WHEN m.legal_entity_id IS NOT NULL THEN 'referenced_by_member'
    ELSE 'most_recent'
  END as selection_reason
FROM legal_entity le
INNER JOIN duplicate_parties dp ON le.party_id = dp.party_id
LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
WHERE le.is_deleted = false
ORDER BY
  le.party_id,
  (m.legal_entity_id IS NOT NULL) DESC, -- Prefer legal_entity referenced by members
  le.dt_created DESC;                   -- Then most recent

DO $$
DECLARE
  v_canonical_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_canonical_count FROM canonical_legal_entities;
  RAISE NOTICE 'Identified % canonical legal_entity records', v_canonical_count;
END $$;

-- =====================================================
-- STEP 3: Update Foreign Key References to Canonical
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 3: Updating foreign key references...'; END $$;

-- Update legal_entity_contact
WITH updates AS (
  UPDATE legal_entity_contact lec
  SET
    legal_entity_id = c.canonical_id,
    dt_modified = NOW(),
    modified_by = 'MIGRATION_027'
  FROM legal_entity le_old
  JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
  WHERE lec.legal_entity_id = le_old.legal_entity_id
    AND le_old.legal_entity_id != c.canonical_id
  RETURNING lec.legal_entity_contact_id
)
SELECT COUNT(*) INTO @contact_count FROM updates;

DO $$ DECLARE v_count INTEGER; BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM legal_entity_contact lec
  JOIN legal_entity le ON lec.legal_entity_id = le.legal_entity_id
  JOIN canonical_legal_entities c ON le.party_id = c.party_id
  WHERE le.legal_entity_id != c.canonical_id;

  RAISE NOTICE 'Updated % legal_entity_contact records', v_count;
END $$;

-- Update legal_entity_number
UPDATE legal_entity_number len
SET
  legal_entity_id = c.canonical_id,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE len.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

DO $$ DECLARE v_count INTEGER; BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM legal_entity_number len
  JOIN legal_entity le ON len.legal_entity_id = le.legal_entity_id
  JOIN canonical_legal_entities c ON le.party_id = c.party_id
  WHERE le.legal_entity_id != c.canonical_id;

  RAISE NOTICE 'Updated % legal_entity_number records', v_count;
END $$;

-- Update legal_entity_endpoint
UPDATE legal_entity_endpoint lee
SET
  legal_entity_id = c.canonical_id,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE lee.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

DO $$ DECLARE v_count INTEGER; BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM legal_entity_endpoint lee
  JOIN legal_entity le ON lee.legal_entity_id = le.legal_entity_id
  JOIN canonical_legal_entities c ON le.party_id = c.party_id
  WHERE le.legal_entity_id != c.canonical_id;

  RAISE NOTICE 'Updated % legal_entity_endpoint records', v_count;
END $$;

-- Update bvad_issued_tokens
UPDATE bvad_issued_tokens bit
SET
  legal_entity_id = c.canonical_id,
  dt_created = NOW(),
  created_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE bit.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update subscriptions
UPDATE subscriptions s
SET
  legal_entity_id = c.canonical_id,
  updated_at = NOW(),
  updated_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE s.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update invoices
UPDATE invoices i
SET
  legal_entity_id = c.canonical_id,
  updated_at = NOW()
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE i.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update dns_verification_tokens
UPDATE dns_verification_tokens dvt
SET
  legal_entity_id = c.canonical_id,
  created_at = NOW()
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE dvt.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update kvk_registry_data
UPDATE kvk_registry_data krd
SET
  legal_entity_id = c.canonical_id,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE krd.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update identifier_verification_history
UPDATE identifier_verification_history ivh
SET
  legal_entity_id = c.canonical_id,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE ivh.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update bdi_orchestration_participants
UPDATE bdi_orchestration_participants bop
SET
  legal_entity_id = c.canonical_id,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_027'
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE bop.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update authorization_log
UPDATE authorization_log al
SET
  legal_entity_id = c.canonical_id
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE al.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update admin_tasks
UPDATE admin_tasks at
SET
  related_entity_id = c.canonical_id,
  updated_at = NOW()
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE at.related_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update newsletter_recipients
UPDATE newsletter_recipients nr
SET
  legal_entity_id = c.canonical_id,
  updated_at = NOW()
FROM legal_entity le_old
JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
WHERE nr.legal_entity_id = le_old.legal_entity_id
  AND le_old.legal_entity_id != c.canonical_id;

-- Update applications (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
    EXECUTE '
      UPDATE applications app
      SET
        created_member_id = c.canonical_id
      FROM legal_entity le_old
      JOIN canonical_legal_entities c ON le_old.party_id = c.party_id
      WHERE app.created_member_id = le_old.legal_entity_id
        AND le_old.legal_entity_id != c.canonical_id
    ';
    RAISE NOTICE 'Updated applications table';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Completed updating foreign key references'; END $$;

-- =====================================================
-- STEP 4: Soft-Delete Duplicate legal_entity Records
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 4: Soft-deleting duplicate legal_entity records...'; END $$;

WITH duplicates_to_delete AS (
  UPDATE legal_entity le
  SET
    is_deleted = true,
    dt_modified = NOW(),
    modified_by = 'MIGRATION_027_CLEANUP'
  FROM canonical_legal_entities c
  WHERE le.party_id = c.party_id
    AND le.legal_entity_id != c.canonical_id
    AND le.is_deleted = false
  RETURNING le.legal_entity_id, le.primary_legal_name
)
SELECT COUNT(*) INTO @deleted_count FROM duplicates_to_delete;

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_deleted_count
  FROM legal_entity le
  JOIN canonical_legal_entities c ON le.party_id = c.party_id
  WHERE le.legal_entity_id != c.canonical_id
    AND le.is_deleted = true
    AND le.modified_by = 'MIGRATION_027_CLEANUP';

  RAISE NOTICE 'Soft-deleted % duplicate legal_entity records', v_deleted_count;
END $$;

-- =====================================================
-- STEP 5: Verify No Duplicates Remain
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 5: Verifying cleanup...'; END $$;

DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_duplicate_count
  FROM (
    SELECT party_id, COUNT(*) as cnt
    FROM legal_entity
    WHERE is_deleted = false
    GROUP BY party_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cleanup failed: % parties still have duplicate legal_entity records', v_duplicate_count;
  ELSE
    RAISE NOTICE 'Verification passed: No duplicate legal_entity records remain ✓';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Add UNIQUE Constraint
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 6: Adding UNIQUE constraint on legal_entity(party_id)...'; END $$;

-- Drop if exists (idempotent)
ALTER TABLE legal_entity
  DROP CONSTRAINT IF EXISTS uq_legal_entity_party_id_active;

-- Add partial UNIQUE constraint (respects soft deletes)
ALTER TABLE legal_entity
  ADD CONSTRAINT uq_legal_entity_party_id_active
    UNIQUE (party_id)
    WHERE is_deleted = false;

COMMENT ON CONSTRAINT uq_legal_entity_party_id_active ON legal_entity IS
  'Ensures 1:1 relationship between party_reference and legal_entity (respects soft deletes)';

DO $$ BEGIN RAISE NOTICE 'UNIQUE constraint added successfully ✓'; END $$;

-- =====================================================
-- STEP 7: Fix v_m2m_credentials_active View
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 7: Updating v_m2m_credentials_active view...'; END $$;

-- Drop old view
DROP VIEW IF EXISTS v_m2m_credentials_active;

-- Recreate with DISTINCT ON to prevent duplicates
CREATE OR REPLACE VIEW v_m2m_credentials_active AS
SELECT DISTINCT ON (c.credential_id)
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
  p.party_type,
  le.primary_legal_name as party_name
FROM ctn_m2m_credentials c
LEFT JOIN party_reference p ON c.party_id = p.party_id
LEFT JOIN legal_entity le ON c.party_id = le.party_id AND le.is_deleted = false
WHERE c.is_deleted = false
  AND c.is_active = true
ORDER BY c.credential_id, le.dt_created DESC; -- Prefer most recent legal_entity

COMMENT ON VIEW v_m2m_credentials_active IS
  'Active M2M credentials with party information. Uses DISTINCT ON to prevent duplicates from multiple legal_entity records per party. Updated 2025-11-13 (Migration 027).';

DO $$ BEGIN RAISE NOTICE 'View v_m2m_credentials_active updated successfully ✓'; END $$;

-- =====================================================
-- STEP 8: Add Data Quality CHECK Constraints
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 8: Adding data quality CHECK constraints...'; END $$;

-- Ensure primary_legal_name is not empty
ALTER TABLE legal_entity
  DROP CONSTRAINT IF EXISTS chk_legal_entity_name_not_empty;

ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_name_not_empty
    CHECK (LENGTH(TRIM(primary_legal_name)) >= 2);

-- Ensure status is valid
ALTER TABLE legal_entity
  DROP CONSTRAINT IF EXISTS chk_legal_entity_status_valid;

ALTER TABLE legal_entity
  ADD CONSTRAINT chk_legal_entity_status_valid
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED'));

DO $$ BEGIN RAISE NOTICE 'Data quality constraints added ✓'; END $$;

-- =====================================================
-- STEP 9: Update Table Comments
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 9: Updating table comments...'; END $$;

COMMENT ON TABLE party_reference IS
  'Abstract party identity. Minimal metadata. Extended by legal_entity table (1:1 relationship enforced by uq_legal_entity_party_id_active).';

COMMENT ON TABLE legal_entity IS
  'Full legal entity details for organizations. 1:1 relationship with party_reference via party_id (enforced by UNIQUE constraint uq_legal_entity_party_id_active).';

COMMENT ON COLUMN legal_entity.party_id IS
  'Foreign key to party_reference. UNIQUE constraint ensures 1:1 relationship (one legal_entity per party).';

DO $$ BEGIN RAISE NOTICE 'Table comments updated ✓'; END $$;

-- =====================================================
-- STEP 10: Final Validation
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 10: Running final validation checks...'; END $$;

DO $$
DECLARE
  v_total_parties INTEGER;
  v_total_legal_entities INTEGER;
  v_constraint_exists BOOLEAN;
BEGIN
  -- Count parties
  SELECT COUNT(*) INTO v_total_parties FROM party_reference WHERE is_deleted = false;
  RAISE NOTICE 'Total active parties: %', v_total_parties;

  -- Count legal_entities
  SELECT COUNT(*) INTO v_total_legal_entities FROM legal_entity WHERE is_deleted = false;
  RAISE NOTICE 'Total active legal_entities: %', v_total_legal_entities;

  -- Verify constraint exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_legal_entity_party_id_active'
  ) INTO v_constraint_exists;

  IF v_constraint_exists THEN
    RAISE NOTICE 'UNIQUE constraint exists ✓';
  ELSE
    RAISE EXCEPTION 'UNIQUE constraint missing! Migration failed.';
  END IF;

  -- Verify view exists
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_m2m_credentials_active') THEN
    RAISE NOTICE 'View v_m2m_credentials_active exists ✓';
  ELSE
    RAISE EXCEPTION 'View v_m2m_credentials_active missing! Migration failed.';
  END IF;

  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Migration 027 completed successfully!';
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
-- -- 1. Drop UNIQUE constraint
-- ALTER TABLE legal_entity DROP CONSTRAINT IF EXISTS uq_legal_entity_party_id_active;
--
-- -- 2. Restore duplicate legal_entity records from backup
-- UPDATE legal_entity le
-- SET
--   is_deleted = false,
--   dt_modified = NOW(),
--   modified_by = 'ROLLBACK_027'
-- FROM legal_entity_backup_20251113 backup
-- WHERE le.legal_entity_id = backup.legal_entity_id
--   AND backup.is_deleted = false
--   AND le.modified_by = 'MIGRATION_027_CLEANUP';
--
-- -- 3. Restore old view definition (without DISTINCT ON)
-- -- (Refer to migration 026 for original view definition)
--
-- COMMIT;
-- =====================================================
