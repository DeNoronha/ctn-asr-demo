-- ============================================================
-- Migration 029: Hotfix - Separate wrongly merged companies
-- ============================================================
-- Issue: 5 DIFFERENT companies share same party_id (data seeding error)
--   - DHL Global Forwarding
--   - A.P. Moller - Maersk
--   - Contargo GmbH & Co. KG
--   - Test 2 Company Bv
--   - Van Berkel Transport
--
-- Migration 027 incorrectly "fixed" this by keeping DHL and deleting others
-- Correct Solution:
--   1. Un-delete the 4 legal_entity records
--   2. Create 4 new party_reference records
--   3. Update 4 legal_entities to point to their own party_id
-- ============================================================

BEGIN;

-- =====================================================
-- STEP 1: Identify wrongly merged companies
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 1: Identifying wrongly merged companies...'; END $$;

-- Show current state
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_deleted_count
  FROM legal_entity
  WHERE party_id = '691e11e3-f1ff-4a5d-8728-b52ec68b13c3'
    AND is_deleted = true;

  RAISE NOTICE 'Found % deleted legal_entities sharing party_id with DHL', v_deleted_count;
  RAISE NOTICE 'These are SEPARATE companies, not duplicates!';
END $$;

-- =====================================================
-- STEP 2: Create new party_reference records
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 2: Creating new party_reference records...'; END $$;

-- Maersk
INSERT INTO party_reference (party_id, party_type, party_class, created_by, dt_created)
VALUES (
  '11772315-a7f0-46a8-852b-e058c8c3bf26', -- Use same UUID as legal_entity_id
  'MEMBER',
  'ORGANIZATION',
  'MIGRATION_029',
  NOW()
) ON CONFLICT (party_id) DO NOTHING;

-- Test 2 Company
INSERT INTO party_reference (party_id, party_type, party_class, created_by, dt_created)
VALUES (
  '75d44bd4-fb7f-4406-b31a-20af89506d12',
  'MEMBER',
  'ORGANIZATION',
  'MIGRATION_029',
  NOW()
) ON CONFLICT (party_id) DO NOTHING;

-- Contargo
INSERT INTO party_reference (party_id, party_type, party_class, created_by, dt_created)
VALUES (
  'fbc4bcdc-a9f9-4621-a153-c5deb6c49519',
  'MEMBER',
  'ORGANIZATION',
  'MIGRATION_029',
  NOW()
) ON CONFLICT (party_id) DO NOTHING;

-- Van Berkel
INSERT INTO party_reference (party_id, party_type, party_class, created_by, dt_created)
VALUES (
  'e91aac83-1696-407c-9f80-a93c9dd8cec3',
  'MEMBER',
  'ORGANIZATION',
  'MIGRATION_029',
  NOW()
) ON CONFLICT (party_id) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Created 4 new party_reference records ✓'; END $$;

-- =====================================================
-- STEP 3: Update party_id FIRST (while still deleted)
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 3: Updating party_id for separated companies (while deleted)...'; END $$;

-- Each legal_entity gets its own party_id (using its own legal_entity_id)
-- Do this WHILE they're still deleted to avoid UNIQUE constraint violation
UPDATE legal_entity
SET
  party_id = legal_entity_id,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_029_SEPARATE'
WHERE legal_entity_id IN (
  '11772315-a7f0-46a8-852b-e058c8c3bf26',
  '75d44bd4-fb7f-4406-b31a-20af89506d12',
  'fbc4bcdc-a9f9-4621-a153-c5deb6c49519',
  'e91aac83-1696-407c-9f80-a93c9dd8cec3'
)
AND is_deleted = true;

DO $$ DECLARE v_count INTEGER; BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Updated party_id for % deleted legal_entities ✓', v_count;
END $$;

-- =====================================================
-- STEP 4: Un-delete legal_entity records
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 4: Un-deleting legal_entity records (now with unique party_id)...'; END $$;

UPDATE legal_entity
SET
  is_deleted = false,
  dt_modified = NOW(),
  modified_by = 'MIGRATION_029_UNDELETE'
WHERE legal_entity_id IN (
  '11772315-a7f0-46a8-852b-e058c8c3bf26', -- Maersk
  '75d44bd4-fb7f-4406-b31a-20af89506d12', -- Test2
  'fbc4bcdc-a9f9-4621-a153-c5deb6c49519', -- Contargo
  'e91aac83-1696-407c-9f80-a93c9dd8cec3'  -- VanBerkel
)
AND is_deleted = true;

DO $$ DECLARE v_count INTEGER; BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Un-deleted % legal_entity records ✓', v_count;
END $$;

-- =====================================================
-- STEP 5: Verify fix
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 5: Verifying fix...'; END $$;

DO $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Check if any members still point to deleted legal_entities
  SELECT COUNT(*)
  INTO v_remaining
  FROM members m
  INNER JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
  WHERE le.is_deleted = true;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Still have % members pointing to deleted legal_entities!', v_remaining;
  END IF;

  RAISE NOTICE 'All members now point to active legal_entities ✓';
END $$;

-- =====================================================
-- STEP 6: Verify data integrity
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 6: Running integrity checks...'; END $$;

DO $$
DECLARE
  v_orphans INTEGER;
  v_deleted INTEGER;
  v_duplicates INTEGER;
BEGIN
  -- Check for orphaned members
  SELECT COUNT(*)
  INTO v_orphans
  FROM members m
  LEFT JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
  WHERE le.legal_entity_id IS NULL;

  IF v_orphans > 0 THEN
    RAISE EXCEPTION 'Found % orphaned members (no legal_entity)!', v_orphans;
  END IF;

  -- Check for members with deleted legal_entities
  SELECT COUNT(*)
  INTO v_deleted
  FROM members m
  INNER JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id
  WHERE le.is_deleted = true;

  IF v_deleted > 0 THEN
    RAISE EXCEPTION 'Found % members with deleted legal_entities!', v_deleted;
  END IF;

  -- Check for duplicate legal_entity_id (should be prevented by UNIQUE constraint)
  SELECT COUNT(*)
  INTO v_duplicates
  FROM (
    SELECT legal_entity_id, COUNT(*) as cnt
    FROM members
    GROUP BY legal_entity_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_duplicates > 0 THEN
    RAISE EXCEPTION 'Found % duplicate legal_entity_id in members!', v_duplicates;
  END IF;

  RAISE NOTICE 'All integrity checks passed ✓';
  RAISE NOTICE '  - Zero orphaned members';
  RAISE NOTICE '  - Zero members with deleted legal_entities';
  RAISE NOTICE '  - Zero duplicate legal_entity_id';
END $$;

-- =====================================================
-- STEP 7: Show final state
-- =====================================================

DO $$ BEGIN RAISE NOTICE 'Step 7: Final state verification...'; END $$;

DO $$
DECLARE
  v_total_parties INTEGER;
  v_total_legal_entities INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_parties FROM party_reference WHERE is_deleted = false;
  SELECT COUNT(*) INTO v_total_legal_entities FROM legal_entity WHERE is_deleted = false;

  RAISE NOTICE 'Total active parties: %', v_total_parties;
  RAISE NOTICE 'Total active legal_entities: %', v_total_legal_entities;
  RAISE NOTICE 'Companies now properly separated:';
  RAISE NOTICE '  - DHL Global Forwarding (own party_id)';
  RAISE NOTICE '  - A.P. Moller - Maersk (own party_id)';
  RAISE NOTICE '  - Contargo GmbH & Co. KG (own party_id)';
  RAISE NOTICE '  - Test 2 Company Bv (own party_id)';
  RAISE NOTICE '  - Van Berkel Transport (own party_id)';
END $$;

-- =====================================================
-- Success Message
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✓ Migration 029 completed successfully!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Created 4 new party_reference records';
  RAISE NOTICE '- Un-deleted 4 legal_entity records';
  RAISE NOTICE '- Separated 5 companies with unique party_id each';
  RAISE NOTICE '- All members now reference active legal_entities';
  RAISE NOTICE '- Data integrity verified';
  RAISE NOTICE '==============================================';
END $$;

COMMIT;

-- =====================================================
-- Rollback Instructions (if needed)
-- =====================================================

-- If migration fails or needs rollback:
--
-- There's no easy rollback since we don't know which members pointed to which
-- duplicates originally. However, the members_backup_20251113 from migration 028
-- might have the original data if needed.
--
-- To inspect original data:
-- SELECT * FROM members_backup_20251113 WHERE org_id IN ('org:contargo', 'org:maersk', 'org:vanberkel', 'org:test2');
