-- Migration 032: Fix missing member records for approved applications
-- Date: 2025-11-21
-- Description: Some approved applications created legal_entity records but failed to create
--              corresponding member records, causing them to not appear in the members list.
--              This migration creates missing member records for all legal entities that don't have them.

-- Insert missing member records for legal entities without members
INSERT INTO members (
  id, org_id, legal_entity_id, email, created_at, updated_at
)
SELECT
  gen_random_uuid() as id,
  le.legal_entity_id as org_id,  -- org_id is same as legal_entity_id
  le.legal_entity_id,
  COALESCE(lec.email, 'noreply@example.com') as email,  -- Use primary contact email or default
  le.dt_created as created_at,
  NOW() as updated_at
FROM legal_entity le
LEFT JOIN members m ON le.legal_entity_id = m.legal_entity_id
LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id AND lec.is_primary = true AND lec.is_deleted = false
WHERE m.id IS NULL  -- No member record exists
  AND le.is_deleted = false
  AND le.status IN ('ACTIVE', 'PENDING')
ON CONFLICT DO NOTHING;

-- Report what was fixed
SELECT
  'Created member record for: ' || le.primary_legal_name as status,
  le.legal_entity_id,
  m.email
FROM legal_entity le
JOIN members m ON le.legal_entity_id = m.legal_entity_id
WHERE m.created_at > (NOW() - INTERVAL '1 minute')  -- Recently created
ORDER BY m.created_at DESC;
