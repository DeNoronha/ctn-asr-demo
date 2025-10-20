-- Migration 014: Fix members without legal_entity_id
-- Date: 2025-10-15
-- Purpose: Create legal entities and link them to members that don't have legal_entity_id

-- Step 1: Show members that need fixing
SELECT
    org_id,
    legal_name,
    domain,
    status,
    legal_entity_id
FROM members
WHERE legal_entity_id IS NULL;

-- Step 2: Create legal entities and link to members
-- This uses a WITH clause to generate UUIDs and insert in one transaction
WITH new_legal_entities AS (
    -- Generate UUIDs for each member without legal_entity_id
    SELECT
        org_id,
        legal_name,
        domain,
        status,
        membership_level,
        metadata,
        gen_random_uuid() as new_legal_entity_id,
        gen_random_uuid() as new_party_id
    FROM members
    WHERE legal_entity_id IS NULL
),
insert_party AS (
    -- Insert party references
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
        new_party_id,
        'ORGANIZATION',
        'MEMBER',
        'system_migration_014',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        FALSE
    FROM new_legal_entities
    RETURNING party_id
),
insert_legal_entity AS (
    -- Insert legal entities
    INSERT INTO legal_entity (
        legal_entity_id,
        party_id,
        primary_legal_name,
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
        nle.new_legal_entity_id,
        nle.new_party_id,
        nle.legal_name,
        nle.domain,
        nle.status,
        nle.membership_level,
        nle.metadata,
        'system_migration_014',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        FALSE
    FROM new_legal_entities nle
    RETURNING legal_entity_id, primary_legal_name
)
-- Update members to link to new legal entities
UPDATE members m
SET legal_entity_id = nle.new_legal_entity_id
FROM new_legal_entities nle
WHERE m.org_id = nle.org_id
RETURNING m.org_id, m.legal_name, m.legal_entity_id;

-- Step 3: Verify all members now have legal_entity_id
SELECT
    COUNT(*) as total_members,
    COUNT(legal_entity_id) as members_with_legal_entity_id,
    COUNT(*) - COUNT(legal_entity_id) as members_without_legal_entity_id
FROM members;

-- Step 4: Show any remaining members without legal_entity_id (should be 0)
SELECT
    org_id,
    legal_name,
    domain,
    status,
    'STILL Missing legal_entity_id' as issue
FROM members
WHERE legal_entity_id IS NULL;

-- Step 5: Verify the legal entities were created
SELECT
    le.legal_entity_id,
    le.primary_legal_name,
    le.domain,
    le.status,
    le.created_by,
    le.dt_created
FROM legal_entity le
WHERE le.created_by = 'system_migration_014'
ORDER BY le.dt_created;
