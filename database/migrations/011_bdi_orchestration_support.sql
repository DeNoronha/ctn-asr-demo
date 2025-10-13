-- ===========================================================================
-- Migration 011: BDI Orchestration Support (BVAD & BVOD)
-- ===========================================================================
-- Purpose: Add support for BDI Verifiable Assurance Documents (BVAD) and
--          BDI Verifiable Orchestration Documents (BVOD)
--
-- BVAD: "Can this member be trusted?" - Issued by CTN ASR
-- BVOD: "Is this member involved in this orchestration?" - Validated by CTN ASR
--
-- Created: 2025-10-13
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Table: bdi_orchestrations
-- Purpose: Track orchestration instances and their participants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bdi_orchestrations (
    orchestration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Orchestration identification
    internal_order_identifier VARCHAR(255) NOT NULL, -- Internal order reference
    orchestrator_domain VARCHAR(255) NOT NULL,       -- Who is orchestrating (e.g., dhl.com)
    orchestrator_legal_name VARCHAR(255),
    orchestrator_lei VARCHAR(20),

    -- Customer information
    customer_domain VARCHAR(255),
    customer_legal_name VARCHAR(255),
    customer_lei VARCHAR(20),

    -- Business keys (Bill of Lading, Container #, etc.)
    business_keys JSONB,                            -- Flexible key-value pairs

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'active',   -- active, completed, cancelled
    orchestration_type VARCHAR(100),                -- transport, customs, warehousing, etc.

    -- Timestamps
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB,                                 -- Additional orchestration data

    -- Audit fields
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT false
);

COMMENT ON TABLE bdi_orchestrations IS 'BDI orchestration instances tracking transport/logistics workflows';
COMMENT ON COLUMN bdi_orchestrations.internal_order_identifier IS 'Internal order/shipment reference from orchestrator';
COMMENT ON COLUMN bdi_orchestrations.business_keys IS 'Business identifiers like Bill of Lading, Container numbers';
COMMENT ON COLUMN bdi_orchestrations.status IS 'Orchestration status: active, completed, cancelled';

-- ---------------------------------------------------------------------------
-- Table: bdi_orchestration_participants
-- Purpose: Track which members are involved in each orchestration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bdi_orchestration_participants (
    participant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestration_id UUID NOT NULL REFERENCES bdi_orchestrations(orchestration_id) ON DELETE CASCADE,
    legal_entity_id UUID REFERENCES legal_entity(legal_entity_id),

    -- Participant identification
    participant_domain VARCHAR(255) NOT NULL,
    participant_legal_name VARCHAR(255),
    participant_kvk VARCHAR(20),
    participant_lei VARCHAR(20),

    -- Role in orchestration
    participant_role VARCHAR(100) NOT NULL,         -- Carrier, Forwarder, Terminal, Customs, etc.

    -- Authorization
    authorized_by VARCHAR(255),                     -- Who authorized this participant
    authorized_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Status
    participant_status VARCHAR(50) DEFAULT 'active', -- active, removed, completed

    -- Timestamps
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Audit
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT false,

    -- Unique constraint: one role per participant per orchestration
    CONSTRAINT uq_orchestration_participant UNIQUE(orchestration_id, participant_domain, participant_role)
);

COMMENT ON TABLE bdi_orchestration_participants IS 'Members/entities involved in BDI orchestrations';
COMMENT ON COLUMN bdi_orchestration_participants.participant_role IS 'Role in orchestration: Carrier, Forwarder, Terminal, Customs Broker, etc.';
COMMENT ON COLUMN bdi_orchestration_participants.authorized_by IS 'Entity that authorized this participant involvement';

-- ---------------------------------------------------------------------------
-- Table: bvad_issued_tokens
-- Purpose: Track issued BVAD tokens for audit and revocation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bvad_issued_tokens (
    bvad_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_entity_id UUID NOT NULL REFERENCES legal_entity(legal_entity_id),

    -- Token identification
    jti VARCHAR(255) NOT NULL UNIQUE,               -- JWT ID (unique token identifier)
    token_hash VARCHAR(255),                        -- SHA-256 hash of full token

    -- Token claims
    issuer VARCHAR(255) NOT NULL,                   -- iss claim
    subject VARCHAR(255) NOT NULL,                  -- sub claim (member domain)
    audience TEXT[],                                -- aud claim (who can use this)

    -- Validity
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,    -- iat claim
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- exp claim
    not_before TIMESTAMP WITH TIME ZONE,            -- nbf claim

    -- Token content snapshot
    claims_snapshot JSONB,                          -- Full claims at time of issuance

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_used_by VARCHAR(255),                      -- Client ID or domain that used it

    -- Revocation
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by VARCHAR(100),
    revocation_reason TEXT,

    -- Audit
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by VARCHAR(100)
);

COMMENT ON TABLE bvad_issued_tokens IS 'Audit trail of issued BVAD tokens for member trust verification';
COMMENT ON COLUMN bvad_issued_tokens.jti IS 'JWT ID from jti claim - unique identifier';
COMMENT ON COLUMN bvad_issued_tokens.claims_snapshot IS 'Snapshot of all claims at issuance time';
COMMENT ON COLUMN bvad_issued_tokens.usage_count IS 'Number of times this token was validated';

-- ---------------------------------------------------------------------------
-- Table: bvod_validation_log
-- Purpose: Log all BVOD validation attempts for security and audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bvod_validation_log (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orchestration_id UUID REFERENCES bdi_orchestrations(orchestration_id),

    -- BVOD token details
    bvod_jti VARCHAR(255),                          -- JWT ID from the BVOD
    bvod_issuer VARCHAR(255),                       -- Who issued the BVOD
    bvod_subject VARCHAR(255),                      -- Subject of the BVOD

    -- Validation request
    requested_by VARCHAR(255),                      -- Client/system requesting validation
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    request_ip_address INET,
    request_user_agent TEXT,

    -- Validation result
    validation_result VARCHAR(50) NOT NULL,         -- valid, invalid, expired, revoked, not_found
    validation_reason TEXT,                         -- Why validation succeeded/failed

    -- Member involvement check
    member_domain_checked VARCHAR(255),             -- Which member was being checked
    member_found_in_orchestration BOOLEAN,
    member_role_in_orchestration VARCHAR(100),

    -- Token details
    token_claims JSONB,                             -- Claims from the BVOD
    signature_valid BOOLEAN,
    token_expired BOOLEAN,
    token_not_yet_valid BOOLEAN,

    -- Performance
    validation_duration_ms INTEGER,                 -- How long validation took

    -- Metadata
    metadata JSONB
);

COMMENT ON TABLE bvod_validation_log IS 'Audit log of BVOD validation requests for security monitoring';
COMMENT ON COLUMN bvod_validation_log.validation_result IS 'Result: valid, invalid, expired, revoked, not_found, signature_invalid';
COMMENT ON COLUMN bvod_validation_log.member_found_in_orchestration IS 'Was the requested member actually involved in the orchestration?';

-- ---------------------------------------------------------------------------
-- Table: bdi_external_systems
-- Purpose: Track external BDI systems that can request BVADs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bdi_external_systems (
    system_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- System identification
    system_name VARCHAR(255) NOT NULL,
    system_domain VARCHAR(255) NOT NULL UNIQUE,
    system_description TEXT,

    -- Authentication (Keycloak client)
    keycloak_client_id VARCHAR(255) UNIQUE,
    client_type VARCHAR(50),                        -- confidential, public, bearer-only

    -- Authorization
    allowed_operations TEXT[],                      -- bvad_generate, bvod_validate, member_lookup
    rate_limit_per_hour INTEGER DEFAULT 1000,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Contact
    admin_contact_name VARCHAR(255),
    admin_contact_email VARCHAR(255),

    -- Timestamps
    dt_created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    dt_modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by VARCHAR(100),
    modified_by VARCHAR(100),
    is_deleted BOOLEAN DEFAULT false
);

COMMENT ON TABLE bdi_external_systems IS 'External BDI systems authorized to access CTN ASR APIs';
COMMENT ON COLUMN bdi_external_systems.allowed_operations IS 'Array of allowed operations: bvad_generate, bvod_validate, member_lookup';
COMMENT ON COLUMN bdi_external_systems.keycloak_client_id IS 'Keycloak client ID for authentication';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- bdi_orchestrations indexes
CREATE INDEX idx_orchestrations_orchestrator ON bdi_orchestrations(orchestrator_domain);
CREATE INDEX idx_orchestrations_customer ON bdi_orchestrations(customer_domain);
CREATE INDEX idx_orchestrations_status ON bdi_orchestrations(status) WHERE is_deleted = false;
CREATE INDEX idx_orchestrations_created ON bdi_orchestrations(dt_created DESC);
CREATE INDEX idx_orchestrations_order_ref ON bdi_orchestrations(internal_order_identifier);
CREATE INDEX idx_orchestrations_business_keys ON bdi_orchestrations USING gin(business_keys);

-- bdi_orchestration_participants indexes
CREATE INDEX idx_participants_orchestration ON bdi_orchestration_participants(orchestration_id);
CREATE INDEX idx_participants_entity ON bdi_orchestration_participants(legal_entity_id);
CREATE INDEX idx_participants_domain ON bdi_orchestration_participants(participant_domain);
CREATE INDEX idx_participants_role ON bdi_orchestration_participants(participant_role);
CREATE INDEX idx_participants_status ON bdi_orchestration_participants(participant_status) WHERE is_deleted = false;

-- bvad_issued_tokens indexes
CREATE INDEX idx_bvad_tokens_entity ON bvad_issued_tokens(legal_entity_id);
CREATE INDEX idx_bvad_tokens_jti ON bvad_issued_tokens(jti);
CREATE INDEX idx_bvad_tokens_subject ON bvad_issued_tokens(subject);
CREATE INDEX idx_bvad_tokens_expires ON bvad_issued_tokens(expires_at);
CREATE INDEX idx_bvad_tokens_issued ON bvad_issued_tokens(issued_at DESC);
CREATE INDEX idx_bvad_tokens_active ON bvad_issued_tokens(is_revoked, expires_at)
    WHERE is_revoked = false AND expires_at > now();

-- bvod_validation_log indexes
CREATE INDEX idx_bvod_validation_orchestration ON bvod_validation_log(orchestration_id);
CREATE INDEX idx_bvod_validation_jti ON bvod_validation_log(bvod_jti);
CREATE INDEX idx_bvod_validation_requested ON bvod_validation_log(requested_at DESC);
CREATE INDEX idx_bvod_validation_result ON bvod_validation_log(validation_result);
CREATE INDEX idx_bvod_validation_member ON bvod_validation_log(member_domain_checked);
CREATE INDEX idx_bvod_validation_requestor ON bvod_validation_log(requested_by);

-- bdi_external_systems indexes
CREATE INDEX idx_bdi_systems_domain ON bdi_external_systems(system_domain);
CREATE INDEX idx_bdi_systems_client ON bdi_external_systems(keycloak_client_id);
CREATE INDEX idx_bdi_systems_active ON bdi_external_systems(is_active, is_approved)
    WHERE is_deleted = false;

-- ---------------------------------------------------------------------------
-- Triggers for updated timestamps
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_bdi_orchestrations_modified
    BEFORE UPDATE ON bdi_orchestrations
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_bdi_participants_modified
    BEFORE UPDATE ON bdi_orchestration_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_bdi_systems_modified
    BEFORE UPDATE ON bdi_external_systems
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();

-- ===========================================================================
-- Sample Data for Testing
-- ===========================================================================

-- Example external BDI system (DHL)
INSERT INTO bdi_external_systems (
    system_name,
    system_domain,
    system_description,
    keycloak_client_id,
    client_type,
    allowed_operations,
    is_active,
    is_approved,
    admin_contact_name,
    admin_contact_email,
    created_by
) VALUES (
    'DHL Supply Chain NL',
    'dhl.com',
    'DHL logistics orchestrator - authorized for BVAD requests and BVOD validation',
    'dhl-supply-chain-nl',
    'confidential',
    ARRAY['bvad_generate', 'bvod_validate', 'member_lookup'],
    true,
    true,
    'Technical Integration Team',
    'bdi-integration@dhl.com',
    'system'
) ON CONFLICT (system_domain) DO NOTHING;

-- Example orchestration
INSERT INTO bdi_orchestrations (
    internal_order_identifier,
    orchestrator_domain,
    orchestrator_legal_name,
    orchestrator_lei,
    customer_domain,
    customer_legal_name,
    customer_lei,
    business_keys,
    status,
    orchestration_type,
    created_by
) VALUES (
    'DHL-ORDER-2025-001234',
    'dhl.com',
    'DHL Supply Chain Netherlands BV',
    '724500F1QBVV6D4V0T23',
    'se.com',
    'Schneider Electric',
    '9695005F0GJX6C1KMG78',
    '{"Bill of Lading": "MSCU123456789", "Container": "MSCU6639871", "Booking": "DHL-BK-98765"}'::jsonb,
    'active',
    'container_transport',
    'system'
) ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Migration Complete
-- ===========================================================================

-- Verification queries
SELECT 'Migration 011 completed successfully' AS status;
SELECT 'Created ' || count(*) || ' new tables' AS tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('bdi_orchestrations', 'bdi_orchestration_participants', 'bvad_issued_tokens', 'bvod_validation_log', 'bdi_external_systems');
