-- Migration 016: Member Registration Applications Table
-- Purpose: Support self-service member registration workflow
-- Date: 2025-10-30
-- Related: docs/MEMBER_REGISTRATION_IMPLEMENTATION_PLAN.md

-- ============================================================================
-- CREATE APPLICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Applicant Information
    applicant_email VARCHAR(255) NOT NULL,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_job_title VARCHAR(255),
    applicant_phone VARCHAR(50),

    -- Company Information (from registration form)
    legal_name VARCHAR(255) NOT NULL,
    kvk_number VARCHAR(50) NOT NULL,
    lei VARCHAR(20),  -- Legal Entity Identifier (optional, 20 chars)
    company_address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Netherlands',

    -- Membership
    membership_type VARCHAR(50) DEFAULT 'basic',

    -- KvK Document
    kvk_document_url TEXT,  -- Azure Blob Storage URL
    kvk_document_filename VARCHAR(255),
    kvk_document_size_bytes INTEGER,
    kvk_document_mime_type VARCHAR(100),

    -- AI-Extracted Data from KvK Document
    kvk_extracted_data JSONB,  -- Store extracted fields for comparison
    kvk_verification_status VARCHAR(50) DEFAULT 'pending',  -- pending, verified, failed, manual_review
    kvk_verification_notes TEXT,

    -- Application Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),

    -- Legal Acceptance
    terms_accepted BOOLEAN DEFAULT FALSE,
    gdpr_consent BOOLEAN DEFAULT FALSE,

    -- Review Process
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID,  -- Admin user ID (no FK - users table doesn't exist)
    review_notes TEXT,
    rejection_reason TEXT,

    -- Created Member Reference (after approval)
    created_member_id UUID REFERENCES legal_entity(legal_entity_id),
    created_azure_ad_invitation_id VARCHAR(255),  -- B2B Invitation ID

    -- Audit Fields
    created_by VARCHAR(255) DEFAULT 'system',
    dt_created TIMESTAMP DEFAULT NOW(),
    dt_updated TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_applications_status
    ON applications(status);

CREATE INDEX IF NOT EXISTS idx_applications_email
    ON applications(applicant_email);

CREATE INDEX IF NOT EXISTS idx_applications_kvk
    ON applications(kvk_number);

CREATE INDEX IF NOT EXISTS idx_applications_submitted_at
    ON applications(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by
    ON applications(reviewed_by)
    WHERE reviewed_by IS NOT NULL;

-- Compound index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_applications_status_submitted
    ON applications(status, submitted_at DESC);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE applications IS
    'Stores member registration applications from the self-service portal. ' ||
    'Tracks the complete lifecycle from submission through review to approval/rejection.';

COMMENT ON COLUMN applications.application_id IS
    'Unique identifier for the application';

COMMENT ON COLUMN applications.kvk_extracted_data IS
    'JSONB field containing data extracted from KvK document via Azure AI Document Intelligence. ' ||
    'Used for automated verification against form-entered data.';

COMMENT ON COLUMN applications.status IS
    'Application status: pending (newly submitted), under_review (admin reviewing), ' ||
    'approved (accepted and member created), rejected (denied with reason)';

COMMENT ON COLUMN applications.kvk_verification_status IS
    'Automated KvK document verification status: pending (not yet processed), ' ||
    'verified (data matches form), failed (data mismatch), manual_review (AI uncertain)';

COMMENT ON COLUMN applications.created_member_id IS
    'References the legal_entities record created upon approval. NULL until approved.';

-- ============================================================================
-- CREATE TRIGGER FOR UPDATED TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_applications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.dt_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_update_timestamp
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_applications_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to API application user (adjust username as needed)
-- These will be configured separately in the deployment process
-- GRANT SELECT, INSERT, UPDATE ON applications TO ctn_api_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table creation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
        RAISE NOTICE '✅ Migration 016 completed: applications table created successfully';
    ELSE
        RAISE EXCEPTION '❌ Migration 016 failed: applications table not found';
    END IF;
END $$;
