-- Seed Data for CTN ASR Database
-- Run this to populate the database with sample members for testing

-- Insert sample members
INSERT INTO members (org_id, legal_name, lei, kvk, domain, status, membership_level, created_at, metadata)
VALUES
  ('ORG-001', 'Acme Logistics BV', 'LEI1234567890ACME1', '12345678', 'acme-logistics.nl', 'ACTIVE', 'PREMIUM', NOW(), '{"country": "NL", "city": "Amsterdam"}'),
  ('ORG-002', 'Rotterdam Shipping Company', 'LEI9876543210ROTT1', '87654321', 'rotterdam-shipping.nl', 'ACTIVE', 'FULL', NOW(), '{"country": "NL", "city": "Rotterdam"}'),
  ('ORG-003', 'Dutch Transport Solutions', 'LEI5555666677778888', '55556666', 'dutch-transport.nl', 'ACTIVE', 'BASIC', NOW(), '{"country": "NL", "city": "Utrecht"}'),
  ('ORG-004', 'Hamburg Container Terminal', 'LEI1111222233334444', '11112222', 'hamburg-container.de', 'PENDING', 'PREMIUM', NOW(), '{"country": "DE", "city": "Hamburg"}'),
  ('ORG-005', 'Antwerp Freight Forwarders', 'LEI9999888877776666', '99998888', 'antwerp-freight.be', 'ACTIVE', 'FULL', NOW(), '{"country": "BE", "city": "Antwerp"}'),
  ('ORG-006', 'Brussels Customs Services', NULL, '44445555', 'brussels-customs.be', 'ACTIVE', 'BASIC', NOW(), '{"country": "BE", "city": "Brussels"}'),
  ('ORG-007', 'Nordic Transport Alliance', 'LEI2222333344445555', '22223333', 'nordic-transport.se', 'SUSPENDED', 'PREMIUM', NOW(), '{"country": "SE", "city": "Stockholm"}'),
  ('ORG-008', 'Mediterranean Logistics Hub', 'LEI7777888899990000', '77778888', 'med-logistics.es', 'ACTIVE', 'FULL', NOW(), '{"country": "ES", "city": "Barcelona"}'),
  ('ORG-009', 'Alpine Shipping GmbH', 'LEI3333444455556666', '33334444', 'alpine-shipping.at', 'ACTIVE', 'BASIC', NOW(), '{"country": "AT", "city": "Vienna"}'),
  ('ORG-010', 'UK Maritime Services Ltd', 'LEI6666777788889999', '66667777', 'uk-maritime.uk', 'PENDING', 'PREMIUM', NOW(), '{"country": "UK", "city": "London"}')
ON CONFLICT (org_id) DO NOTHING;

-- Verify the insert
SELECT COUNT(*) as total_members FROM members;
SELECT org_id, legal_name, status, membership_level FROM members ORDER BY created_at DESC LIMIT 10;
