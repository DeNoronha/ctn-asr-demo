-- Fix LK Holding missing member record
-- The legal_entity exists (8fc8562b-96d5-4a97-9195-a8682abefee5) but no member record

-- Insert missing member record
INSERT INTO members (
  id, org_id, legal_entity_id, email, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '8fc8562b-96d5-4a97-9195-a8682abefee5',  -- org_id (same as legal_entity_id substring)
  '8fc8562b-96d5-4a97-9195-a8682abefee5',  -- legal_entity_id
  'learco@portraxx.com',  -- email from application
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Verify the member was created
SELECT m.id, m.email, le.primary_legal_name 
FROM members m 
JOIN legal_entity le ON m.legal_entity_id = le.legal_entity_id 
WHERE le.primary_legal_name = 'Lk Holding';
