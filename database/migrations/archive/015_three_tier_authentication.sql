-- ============================================
-- Migration: Three-Tier Authentication System
-- Created: 2025-10-28
-- Description: Add authentication tier columns and DNS verification support
-- ============================================

BEGIN;

-- Add tier-related columns to legal_entity table
ALTER TABLE public.legal_entity
    ADD COLUMN IF NOT EXISTS authentication_tier INTEGER DEFAULT 3 NOT NULL
        CONSTRAINT ck_authentication_tier CHECK (authentication_tier IN (1, 2, 3)),
    ADD COLUMN IF NOT EXISTS authentication_method VARCHAR(50) DEFAULT 'EmailVerification'
        CONSTRAINT ck_authentication_method CHECK (authentication_method IN ('eHerkenning', 'DNS', 'EmailVerification')),
    ADD COLUMN IF NOT EXISTS dns_verified_domain VARCHAR(255),
    ADD COLUMN IF NOT EXISTS dns_verification_initiated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS dns_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS dns_reverification_due TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS eherkenning_identifier VARCHAR(255),
    ADD COLUMN IF NOT EXISTS eherkenning_level VARCHAR(10); -- 'EH3' or 'EH4'

-- Add comments for documentation
COMMENT ON COLUMN public.legal_entity.authentication_tier IS 'Authentication tier: 1=eHerkenning (full access), 2=DNS verification (sensitive data), 3=Email+KvK (public data only)';
COMMENT ON COLUMN public.legal_entity.authentication_method IS 'Method used for authentication: eHerkenning, DNS, or EmailVerification';
COMMENT ON COLUMN public.legal_entity.dns_verified_domain IS 'Domain verified via DNS TXT record (Tier 2 only)';
COMMENT ON COLUMN public.legal_entity.dns_reverification_due IS 'Date when DNS verification needs to be re-checked (90 days from verification)';
COMMENT ON COLUMN public.legal_entity.eherkenning_identifier IS 'eHerkenning unique identifier';
COMMENT ON COLUMN public.legal_entity.eherkenning_level IS 'eHerkenning assurance level (EH3 or EH4)';

-- Create DNS verification tokens table
CREATE TABLE IF NOT EXISTS public.dns_verification_tokens (
    token_id UUID DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    record_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL
        CONSTRAINT ck_dns_token_status CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
    verification_attempts INTEGER DEFAULT 0,
    last_verification_attempt TIMESTAMP WITH TIME ZONE,
    verification_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    PRIMARY KEY (token_id),
    CONSTRAINT fk_dns_token_legal_entity
        FOREIGN KEY (legal_entity_id)
        REFERENCES public.legal_entity (legal_entity_id)
        ON DELETE CASCADE
);

-- Create indexes for DNS verification tokens
CREATE INDEX idx_dns_tokens_legal_entity ON public.dns_verification_tokens (legal_entity_id);
CREATE INDEX idx_dns_tokens_domain ON public.dns_verification_tokens (domain);
CREATE INDEX idx_dns_tokens_status ON public.dns_verification_tokens (status);
CREATE INDEX idx_dns_tokens_expires ON public.dns_verification_tokens (expires_at) WHERE status = 'pending';
CREATE UNIQUE INDEX uq_dns_token_active ON public.dns_verification_tokens (legal_entity_id, domain)
    WHERE status = 'pending';

-- Add comments
COMMENT ON TABLE public.dns_verification_tokens IS 'DNS TXT record verification tokens for Tier 2 authentication';
COMMENT ON COLUMN public.dns_verification_tokens.token IS 'DNS token to be placed in TXT record (format: ctn-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX)';
COMMENT ON COLUMN public.dns_verification_tokens.record_name IS 'Full DNS record name (format: _ctn-verify.domain.com)';
COMMENT ON COLUMN public.dns_verification_tokens.verification_details IS 'JSON details from DNS lookup (resolvers, responses, timestamps)';

-- Create authorization log table for audit trail
CREATE TABLE IF NOT EXISTS public.authorization_log (
    log_id UUID DEFAULT gen_random_uuid() NOT NULL,
    legal_entity_id UUID,
    user_identifier VARCHAR(255),
    requested_resource VARCHAR(255) NOT NULL,
    requested_action VARCHAR(100) NOT NULL,
    required_tier INTEGER NOT NULL,
    user_tier INTEGER,
    authorization_result VARCHAR(20) NOT NULL
        CONSTRAINT ck_auth_result CHECK (authorization_result IN ('granted', 'denied')),
    denial_reason TEXT,
    request_ip_address INET,
    request_user_agent TEXT,
    request_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB,
    PRIMARY KEY (log_id),
    CONSTRAINT fk_auth_log_legal_entity
        FOREIGN KEY (legal_entity_id)
        REFERENCES public.legal_entity (legal_entity_id)
        ON DELETE SET NULL
);

-- Create indexes for authorization log
CREATE INDEX idx_auth_log_legal_entity ON public.authorization_log (legal_entity_id);
CREATE INDEX idx_auth_log_created ON public.authorization_log (created_at DESC);
CREATE INDEX idx_auth_log_result ON public.authorization_log (authorization_result);
CREATE INDEX idx_auth_log_denied ON public.authorization_log (authorization_result, created_at DESC)
    WHERE authorization_result = 'denied';
CREATE INDEX idx_auth_log_user ON public.authorization_log (user_identifier, created_at DESC);

-- Add comments
COMMENT ON TABLE public.authorization_log IS 'Audit log for tier-based authorization decisions';
COMMENT ON COLUMN public.authorization_log.required_tier IS 'Minimum tier required to access the resource';
COMMENT ON COLUMN public.authorization_log.user_tier IS 'Actual tier of the user making the request';
COMMENT ON COLUMN public.authorization_log.denial_reason IS 'Reason for denial (e.g., "Insufficient tier: requires 2, has 3")';

-- Create indexes on legal_entity for tier queries
CREATE INDEX idx_legal_entity_tier ON public.legal_entity (authentication_tier);
CREATE INDEX idx_legal_entity_auth_method ON public.legal_entity (authentication_method);
CREATE INDEX idx_legal_entity_dns_reverification ON public.legal_entity (dns_reverification_due)
    WHERE dns_reverification_due IS NOT NULL AND authentication_tier = 2;

-- Update existing records to have default tier (Tier 3 - Email verification)
-- All current members are email-verified (Tier 3)
UPDATE public.legal_entity
SET
    authentication_tier = 3,
    authentication_method = 'EmailVerification'
WHERE
    authentication_tier IS NULL;

COMMIT;

-- ============================================
-- Migration Notes:
-- - All existing legal entities default to Tier 3 (Email + KvK verification)
-- - Tier 1 (eHerkenning) requires external SSO integration
-- - Tier 2 (DNS) requires DNS TXT record verification
-- - DNS re-verification required every 90 days for Tier 2
-- - Authorization log captures all tier-based access decisions
-- ============================================
