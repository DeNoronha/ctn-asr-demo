-- Migration 046: Rename PRIMARY contact type to AUTHORIZED_REP
-- The authorized representative (bestuurder/gevolmachtigde) is the person who
-- initiates company onboarding, verified via eHerkenning in NL.

-- Update existing PRIMARY contacts to AUTHORIZED_REP
UPDATE legal_entity_contact
SET contact_type = 'AUTHORIZED_REP',
    dt_modified = NOW()
WHERE contact_type = 'PRIMARY';

-- Update the CHECK constraint to use new contact types
ALTER TABLE legal_entity_contact
DROP CONSTRAINT IF EXISTS legal_entity_contact_contact_type_check;

ALTER TABLE legal_entity_contact
ADD CONSTRAINT legal_entity_contact_contact_type_check
CHECK (contact_type IN ('AUTHORIZED_REP', 'TECHNICAL', 'BILLING', 'SUPPORT', 'LEGAL', 'OTHER'));

-- Add comment explaining the contact types
COMMENT ON COLUMN legal_entity_contact.contact_type IS
'Contact type: AUTHORIZED_REP (bestuurder/gevolmachtigde - verified via eHerkenning), TECHNICAL, BILLING, SUPPORT, LEGAL, OTHER';
