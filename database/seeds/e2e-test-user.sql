-- ============================================
-- E2E Test User Data Setup
-- ============================================
-- Created: 2025-11-14
-- Purpose: Create test data for Playwright E2E tests
-- Test User: test-e2@denoronha.consulting
-- Object ID: 7e093589-f654-4e53-9522-898995d1201b
-- ============================================

-- Clean up existing test data (if any)
DELETE FROM legal_entity_contact WHERE email = 'test-e2@denoronha.consulting';
DELETE FROM legal_entity WHERE primary_legal_name = 'E2E Test Organization';
DELETE FROM party_reference WHERE party_id IN (
  SELECT party_id FROM legal_entity WHERE primary_legal_name = 'E2E Test Organization'
);

-- Step 1: Create party_reference
INSERT INTO party_reference (
  party_id,
  party_type,
  is_deleted,
  dt_created,
  dt_modified
)
VALUES (
  '00000000-0000-0000-0000-000000000e2e', -- Fixed UUID for test user
  'LEGAL_ENTITY',
  false,
  NOW(),
  NOW()
) ON CONFLICT (party_id) DO NOTHING;

-- Step 2: Create legal_entity
INSERT INTO legal_entity (
  legal_entity_id,
  party_id,
  primary_legal_name,
  entity_legal_form,
  entity_status,
  country_code,
  is_deleted,
  dt_created,
  dt_modified
)
VALUES (
  '11111111-1111-1111-1111-111111111e2e', -- Fixed UUID for test legal entity
  '00000000-0000-0000-0000-000000000e2e',
  'E2E Test Organization',
  'BV',
  'ACTIVE',
  'NL',
  false,
  NOW(),
  NOW()
) ON CONFLICT (legal_entity_id) DO NOTHING;

-- Step 3: Create contact for test user
INSERT INTO legal_entity_contact (
  contact_id,
  legal_entity_id,
  contact_type,
  full_name,
  email,
  phone_number,
  job_title,
  is_active,
  is_deleted,
  dt_created,
  dt_modified
)
VALUES (
  '22222222-2222-2222-2222-222222222e2e', -- Fixed UUID for test contact
  '11111111-1111-1111-1111-111111111e2e',
  'PRIMARY',
  'E2E Test User',
  'test-e2@denoronha.consulting',
  '+31 20 123 4567',
  'Test Automation Engineer',
  true,
  false,
  NOW(),
  NOW()
) ON CONFLICT (contact_id) DO NOTHING;

-- Step 4: Add test identifiers (optional - for comprehensive testing)
INSERT INTO legal_entity_number (
  identifier_id,
  legal_entity_id,
  identifier_type,
  identifier_value,
  country_code,
  registry_name,
  registry_url,
  validation_status,
  is_deleted,
  dt_created,
  dt_modified
)
VALUES (
  '33333333-3333-3333-3333-333333333e2e',
  '11111111-1111-1111-1111-111111111e2e',
  'KVK',
  '12345678',
  'NL',
  'Kamer van Koophandel',
  'https://www.kvk.nl',
  'PENDING',
  false,
  NOW(),
  NOW()
) ON CONFLICT (identifier_id) DO NOTHING;

-- Step 5: Create member view entry (if v_members_full expects it)
-- Note: v_members_full might be a view that joins legal_entity with other tables
-- Check if 'members' table exists, if so, add entry there

-- Verification query
SELECT
  c.email,
  c.full_name,
  c.job_title,
  le.primary_legal_name,
  le.entity_status,
  le.entity_legal_form,
  len.identifier_type,
  len.identifier_value
FROM legal_entity_contact c
JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
  AND len.is_deleted = false
WHERE c.email = 'test-e2@denoronha.consulting'
  AND c.is_deleted = false;

-- Expected output:
-- email                           | full_name      | job_title                    | primary_legal_name      | entity_status | entity_legal_form | identifier_type | identifier_value
-- --------------------------------|----------------|------------------------------|-------------------------|---------------|-------------------|-----------------|------------------
-- test-e2@denoronha.consulting    | E2E Test User  | Test Automation Engineer     | E2E Test Organization   | ACTIVE        | BV                | KVK             | 12345678

-- ============================================
-- Cleanup Script (run after tests if needed)
-- ============================================
-- DELETE FROM legal_entity_number WHERE identifier_id = '33333333-3333-3333-3333-333333333e2e';
-- DELETE FROM legal_entity_contact WHERE contact_id = '22222222-2222-2222-2222-222222222e2e';
-- DELETE FROM legal_entity WHERE legal_entity_id = '11111111-1111-1111-1111-111111111e2e';
-- DELETE FROM party_reference WHERE party_id = '00000000-0000-0000-0000-000000000e2e';
