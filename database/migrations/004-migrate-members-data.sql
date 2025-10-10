-- Data Migration: Members → Legal Entity
-- Date: October 10, 2025

-- Step 1: Create party references
INSERT INTO party_reference (party_id, party_class, party_type, created_by)
SELECT 
  m.id,
  'ORGANIZATION',
  'LEGAL_ENTITY',
  'SYSTEM_MIGRATION'
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM party_reference pr WHERE pr.party_id = m.id
);

-- Step 2: Insert into legal_entity
INSERT INTO legal_entity (
  legal_entity_id,
  party_id,
  primary_legal_name,
  domain,
  status,
  membership_level,
  metadata,
  created_by
)
SELECT 
  m.id,
  m.id,
  m.legal_name,
  m.domain,
  m.status,
  m.membership_level,
  m.metadata,
  'SYSTEM_MIGRATION'
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM legal_entity le WHERE le.legal_entity_id = m.id
);

-- Step 3: Insert LEI identifiers
INSERT INTO legal_entity_number (
  legal_entity_id,
  identifier_type,
  identifier_value,
  validation_status,
  created_by
)
SELECT 
  m.id,
  'LEI',
  m.lei,
  'VERIFIED',
  'SYSTEM_MIGRATION'
FROM members m
WHERE m.lei IS NOT NULL 
  AND m.lei != ''
  AND NOT EXISTS (
    SELECT 1 FROM legal_entity_number len
    WHERE len.legal_entity_id = m.id AND len.identifier_type = 'LEI'
  );

-- Step 4: Insert KVK identifiers
INSERT INTO legal_entity_number (
  legal_entity_id,
  identifier_type,
  identifier_value,
  validation_status,
  created_by
)
SELECT 
  m.id,
  'KVK',
  m.kvk,
  'VERIFIED',
  'SYSTEM_MIGRATION'
FROM members m
WHERE m.kvk IS NOT NULL 
  AND m.kvk != ''
  AND NOT EXISTS (
    SELECT 1 FROM legal_entity_number len
    WHERE len.legal_entity_id = m.id AND len.identifier_type = 'KVK'
  );

-- Verify
SELECT 
  (SELECT COUNT(*) FROM members) as members_count,
  (SELECT COUNT(*) FROM legal_entity) as legal_entity_count;
