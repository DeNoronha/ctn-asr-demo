-- Add legal_entity_id to members table and create sample data

-- 1. Add legal_entity_id column to members
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS legal_entity_id UUID REFERENCES legal_entity(legal_entity_id);

-- 2. Create a default party for legal entities without one
INSERT INTO party_reference (party_id, party_class, party_type)
SELECT gen_random_uuid(), 'ORGANIZATION', 'MEMBER'
WHERE NOT EXISTS (SELECT 1 FROM party_reference WHERE party_class = 'ORGANIZATION' LIMIT 1)
RETURNING party_id;

-- 3. Create sample legal entities for existing members
INSERT INTO legal_entity (
    legal_entity_id, 
    party_id,
    primary_legal_name, 
    address_line1, 
    postal_code, 
    city, 
    country_code, 
    entity_legal_form, 
    registered_at
)
SELECT 
    gen_random_uuid(),
    (SELECT party_id FROM party_reference WHERE party_class = 'ORGANIZATION' LIMIT 1),
    m.legal_name,
    'Hoofdstraat 123',
    '1012 AB',
    'Amsterdam',
    'NL',
    'BV',
    COALESCE(m.kvk, 'N/A')
FROM members m
WHERE NOT EXISTS (
    SELECT 1 FROM legal_entity WHERE primary_legal_name = m.legal_name
)
ON CONFLICT DO NOTHING;

-- 4. Link members to their legal entities
UPDATE members m
SET legal_entity_id = le.legal_entity_id
FROM legal_entity le
WHERE m.legal_name = le.primary_legal_name
AND m.legal_entity_id IS NULL;

-- 5. Create sample contacts for each legal entity (only if they don't exist)
INSERT INTO legal_entity_contact (
    legal_entity_id, 
    contact_type, 
    first_name, 
    last_name, 
    full_name,
    email, 
    phone, 
    job_title, 
    is_primary
)
SELECT 
    le.legal_entity_id,
    'Primary',
    'John',
    'Doe',
    'John Doe',
    'john.doe@' || LOWER(REPLACE(le.primary_legal_name, ' ', '')) || '.com',
    '+31 20 123 4567',
    'IT Manager',
    TRUE
FROM legal_entity le
WHERE NOT EXISTS (
    SELECT 1 FROM legal_entity_contact lec
    WHERE lec.legal_entity_id = le.legal_entity_id
);
