-- ========================================
-- Migration 015: Add Azure AD Object ID Mapping
-- ========================================
-- Purpose: Enable Azure AD user → party_id resolution for multi-tenant data isolation
-- Security Impact: CRITICAL - Resolves IDOR vulnerabilities in Orchestrator Portal
-- Related: AUTH-001 implementation

-- Add Azure AD object ID mapping to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS azure_ad_object_id UUID;

-- Add email field for fallback lookup and user identification
ALTER TABLE members
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create partial index for fast oid lookups (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_members_azure_ad_oid
ON members(azure_ad_object_id)
WHERE azure_ad_object_id IS NOT NULL;

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS idx_members_email
ON members(email)
WHERE email IS NOT NULL;

-- Add unique constraint to prevent duplicate Azure AD mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_azure_ad_oid_unique
ON members(azure_ad_object_id)
WHERE azure_ad_object_id IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN members.azure_ad_object_id IS
'Azure AD object ID (oid claim from JWT) for user authentication mapping. Maps authenticated users to their organization.';

COMMENT ON COLUMN members.email IS
'Primary contact email for the member organization. Used for notifications and fallback authentication lookup.';

-- Verification query (shows table structure)
\d members;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 015 completed successfully';
  RAISE NOTICE 'Added azure_ad_object_id and email columns to members table';
  RAISE NOTICE 'Created indexes: idx_members_azure_ad_oid, idx_members_email, idx_members_azure_ad_oid_unique';
  RAISE NOTICE 'Next step: Populate azure_ad_object_id for existing users';
END $$;
