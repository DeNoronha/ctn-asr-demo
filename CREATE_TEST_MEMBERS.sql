-- Create Test Members for Demo
-- Run this if you see no members in the admin portal

-- First, ensure we have a legal entity
INSERT INTO legal_entity (
    legal_entity_id,
    party_id,
    primary_legal_name,
    address_line1,
    city,
    postal_code,
    country_code,
    entity_legal_form,
    domain,
    status,
    membership_level
)
VALUES (
    gen_random_uuid(),
    (SELECT party_id FROM party_reference WHERE party_class = 'LEGAL_ENTITY' LIMIT 1),
    'Connected Trade Network BV',
    'Weena 690',
    'Rotterdam',
    '3012 CN',
    'NL',
    'BV',
    'connectedtradenetwork.org',
    'ACTIVE',
    'ENTERPRISE'
)
ON CONFLICT DO NOTHING;

-- Create member for CTN
INSERT INTO members (
    org_id,
    legal_name,
    domain,
    status,
    membership_level,
    kvk,
    lei,
    legal_entity_id
)
VALUES (
    'CTN-001',
    'Connected Trade Network',
    'connectedtradenetwork.org',
    'Active',
    'Enterprise',
    '12345678',
    'CTNNL001',
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Connected Trade Network BV' LIMIT 1)
)
ON CONFLICT (org_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    status = EXCLUDED.status;

-- Add international registry identifiers
INSERT INTO legal_entity_number (
    legal_entity_id,
    identifier_type,
    identifier_value,
    country_code,
    registry_name,
    registry_url,
    validation_status
)
VALUES
(
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Connected Trade Network BV' LIMIT 1),
    'KVK',
    '12345678',
    'NL',
    'Kamer van Koophandel',
    'https://www.kvk.nl/',
    'VALIDATED'
),
(
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Connected Trade Network BV' LIMIT 1),
    'LEI',
    '724500VKKSH9QOLTFR81',
    'NL',
    'Global Legal Entity Identifier Foundation',
    'https://www.gleif.org/',
    'VALIDATED'
),
(
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Connected Trade Network BV' LIMIT 1),
    'EUID',
    'NL.KVK.12345678',
    'NL',
    'European Business Register',
    'https://www.ebr.org/',
    'VALIDATED'
)
ON CONFLICT DO NOTHING;

-- Add a contact for your user
INSERT INTO legal_entity_contact (
    legal_entity_id,
    contact_type,
    full_name,
    email,
    phone,
    job_title,
    is_primary,
    is_active
)
VALUES (
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Connected Trade Network BV' LIMIT 1),
    'PRIMARY',
    'Ramon de Noronha',
    'ramon@denoronha.consulting',
    '+31612345678',
    'System Administrator',
    true,
    true
)
ON CONFLICT DO NOTHING;

-- Create second test member
INSERT INTO legal_entity (
    legal_entity_id,
    party_id,
    primary_legal_name,
    address_line1,
    city,
    postal_code,
    country_code,
    entity_legal_form,
    domain,
    status,
    membership_level
)
VALUES (
    gen_random_uuid(),
    (SELECT party_id FROM party_reference WHERE party_class = 'LEGAL_ENTITY' LIMIT 1),
    'Example Logistics GmbH',
    'Hauptstraße 123',
    'Berlin',
    '10115',
    'DE',
    'GmbH',
    'example-logistics.de',
    'ACTIVE',
    'PREMIUM'
)
ON CONFLICT DO NOTHING;

INSERT INTO members (
    org_id,
    legal_name,
    domain,
    status,
    membership_level,
    legal_entity_id
)
VALUES (
    'EXL-DE-001',
    'Example Logistics',
    'example-logistics.de',
    'Active',
    'Premium',
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Example Logistics GmbH' LIMIT 1)
)
ON CONFLICT (org_id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name;

-- Add German registry identifiers
INSERT INTO legal_entity_number (
    legal_entity_id,
    identifier_type,
    identifier_value,
    country_code,
    registry_name,
    registry_url,
    validation_status
)
VALUES
(
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Example Logistics GmbH' LIMIT 1),
    'HRB',
    'HRB 12345 B',
    'DE',
    'Handelsregister Berlin',
    'https://www.handelsregister.de/',
    'VALIDATED'
),
(
    (SELECT legal_entity_id FROM legal_entity WHERE primary_legal_name = 'Example Logistics GmbH' LIMIT 1),
    'LEI',
    '529900T8BM49AURSDO55',
    'DE',
    'Global Legal Entity Identifier Foundation',
    'https://www.gleif.org/',
    'VALIDATED'
)
ON CONFLICT DO NOTHING;

-- Verify members were created
SELECT
    org_id,
    legal_name,
    domain,
    status,
    membership_level,
    'Success!' as result
FROM members
ORDER BY created_at DESC
LIMIT 5;

-- Show registry identifiers
SELECT
    le.primary_legal_name,
    len.identifier_type,
    len.identifier_value,
    len.country_code,
    len.registry_name
FROM legal_entity le
JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
WHERE len.is_deleted IS NULL OR len.is_deleted = false
ORDER BY le.primary_legal_name, len.identifier_type;
