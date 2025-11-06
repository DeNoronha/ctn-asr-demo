-- =====================================================
-- Migration: Add CHECK Constraints for Data Validation
-- Date: November 6, 2025
-- Purpose: Enforce data integrity at database level
-- =====================================================
-- This migration adds CHECK constraints to prevent invalid values
-- from being inserted into critical fields. Previously, validation
-- only existed in frontend code, allowing API calls to bypass checks.
-- =====================================================

-- =====================================================
-- 1. Members Table - Status Constraint
-- =====================================================
-- Enforce valid member statuses
-- Valid values: ACTIVE, PENDING, SUSPENDED, TERMINATED

ALTER TABLE members
ADD CONSTRAINT chk_members_status
CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED', 'TERMINATED'));

COMMENT ON CONSTRAINT chk_members_status ON members IS
'Ensures member status is one of: ACTIVE, PENDING, SUSPENDED, TERMINATED';

-- =====================================================
-- 2. Members Table - Membership Level Constraint
-- =====================================================
-- Enforce valid membership levels
-- Valid values: BASIC, FULL, PREMIUM
-- Note: ENTERPRISE was changed to FULL on November 6, 2025

ALTER TABLE members
ADD CONSTRAINT chk_members_membership_level
CHECK (membership_level IN ('BASIC', 'FULL', 'PREMIUM'));

COMMENT ON CONSTRAINT chk_members_membership_level ON members IS
'Ensures membership level is one of: BASIC, FULL, PREMIUM';

-- =====================================================
-- 3. Legal Entity Contact - Contact Type Constraint
-- =====================================================
-- Enforce valid contact types
-- Valid values: PRIMARY, TECHNICAL, BILLING, SUPPORT, LEGAL, OTHER

ALTER TABLE legal_entity_contact
ADD CONSTRAINT chk_contact_type
CHECK (contact_type IN ('PRIMARY', 'TECHNICAL', 'BILLING', 'SUPPORT', 'LEGAL', 'OTHER'));

COMMENT ON CONSTRAINT chk_contact_type ON legal_entity_contact IS
'Ensures contact type is one of: PRIMARY, TECHNICAL, BILLING, SUPPORT, LEGAL, OTHER';

-- =====================================================
-- Verification Queries
-- =====================================================

-- Verify constraints were added
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN (
  'members'::regclass,
  'legal_entity_contact'::regclass
)
AND contype = 'c'  -- CHECK constraints only
ORDER BY conrelid::regclass::text, conname;

-- Verify current data distribution
SELECT 'Members Status' AS metric, status AS value, COUNT(*) AS count
FROM members
GROUP BY status
UNION ALL
SELECT 'Members Membership Level' AS metric, membership_level AS value, COUNT(*) AS count
FROM members
WHERE membership_level IS NOT NULL
GROUP BY membership_level
UNION ALL
SELECT 'Contact Type' AS metric, contact_type AS value, COUNT(*) AS count
FROM legal_entity_contact
GROUP BY contact_type
ORDER BY metric, value;
