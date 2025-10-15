-- Migration 013: Ensure all members have corresponding legal entity records
-- Date: 2025-10-15
-- Purpose: Fix missing legal entity records that block identifier management

-- Step 1: Identify members with missing legal entities
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM members m
    WHERE m.legal_entity_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM legal_entity le
          WHERE le.legal_entity_id = m.legal_entity_id
      );

    RAISE NOTICE 'Found % members with missing legal entity records', missing_count;
END $$;

-- Step 2: Create party references for missing legal entities
INSERT INTO party_reference (
    party_id,
    party_class,
    party_type,
    created_by,
    dt_created,
    dt_modified,
    is_deleted
)
SELECT
    m.legal_entity_id,
    'ORGANIZATION',
    'MEMBER',
    'system_migration_013',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    FALSE
FROM members m
WHERE m.legal_entity_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM party_reference pr
      WHERE pr.party_id = m.legal_entity_id
  )
ON CONFLICT (party_id) DO NOTHING;

-- Step 3: Create missing legal entity records
INSERT INTO legal_entity (
    legal_entity_id,
    party_id,
    primary_legal_name,
    address_line1,
    address_line2,
    postal_code,
    city,
    province,
    country_code,
    entity_legal_form,
    registered_at,
    domain,
    status,
    membership_level,
    metadata,
    created_by,
    dt_created,
    dt_modified,
    is_deleted
)
SELECT
    m.legal_entity_id,
    m.legal_entity_id,  -- party_id same as legal_entity_id
    m.legal_name,
    NULL,  -- address fields not available from members table
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,  -- entity_legal_form
    NULL,  -- registered_at
    m.domain,
    m.status,
    m.membership_level,
    m.metadata,
    'system_migration_013',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    FALSE
FROM members m
WHERE m.legal_entity_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM legal_entity le
      WHERE le.legal_entity_id = m.legal_entity_id
  );

-- Step 4: Report results
DO $$
DECLARE
    created_count INTEGER;
    total_members INTEGER;
    total_entities INTEGER;
    members_with_entities INTEGER;
BEGIN
    -- Count how many legal entities were created
    SELECT COUNT(*) INTO created_count
    FROM legal_entity
    WHERE created_by = 'system_migration_013';

    -- Count total members
    SELECT COUNT(*) INTO total_members
    FROM members
    WHERE legal_entity_id IS NOT NULL;

    -- Count total legal entities
    SELECT COUNT(*) INTO total_entities
    FROM legal_entity
    WHERE is_deleted = FALSE;

    -- Count members that now have legal entities
    SELECT COUNT(*) INTO members_with_entities
    FROM members m
    WHERE m.legal_entity_id IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM legal_entity le
          WHERE le.legal_entity_id = m.legal_entity_id
      );

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 013 Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created % new legal entity records', created_count;
    RAISE NOTICE 'Total members with legal_entity_id: %', total_members;
    RAISE NOTICE 'Members with linked legal entities: %', members_with_entities;
    RAISE NOTICE 'Total active legal entities: %', total_entities;
    RAISE NOTICE '========================================';
END $$;

-- Step 5: Verify no members are left without legal entities
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM members m
    WHERE m.legal_entity_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM legal_entity le
          WHERE le.legal_entity_id = m.legal_entity_id
      );

    IF remaining_count > 0 THEN
        RAISE WARNING 'WARNING: % members still have missing legal entities!', remaining_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All members now have legal entity records';
    END IF;
END $$;

-- Step 6: List any members without legal_entity_id (these need manual attention)
SELECT
    org_id,
    legal_name,
    domain,
    status,
    'Missing legal_entity_id' as issue
FROM members
WHERE legal_entity_id IS NULL
ORDER BY created_at DESC;
