-- =====================================================
-- Enhanced Schema Migration
-- Implements: Multi-endpoint, Flexible Identifiers, 
--             Enhanced Entity Model, Contact Management
-- Date: October 9, 2025
-- =====================================================

-- =====================================================
-- STEP 1: CREATE NEW CORE TABLES
-- =====================================================

-- 1.1 Party Reference (Base for all entities)
CREATE TABLE IF NOT EXISTS party_reference (
  party_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  is_deleted BOOLEAN DEFAULT false,
  party_class VARCHAR(255),
  party_type VARCHAR(255)
);

CREATE INDEX idx_party_reference_created ON party_reference(dt_created);
CREATE INDEX idx_party_reference_deleted ON party_reference(is_deleted) WHERE is_deleted = false;

-- 1.2 Legal Entity (Enhanced company information)
CREATE TABLE IF NOT EXISTS legal_entity (
  legal_entity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  is_deleted BOOLEAN DEFAULT false,
  
  primary_legal_name VARCHAR(255) NOT NULL,
  
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  postal_code VARCHAR(255),
  city VARCHAR(255),
  province VARCHAR(255),
  country_code VARCHAR(2),
  
  entity_legal_form VARCHAR(255),
  registered_at VARCHAR(255),
  
  direct_parent_legal_entity_id UUID,
  ultimate_parent_legal_entity_id UUID,
  
  domain VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING',
  membership_level VARCHAR(20) DEFAULT 'BASIC',
  metadata JSONB,
  
  CONSTRAINT fk_party FOREIGN KEY (party_id) REFERENCES party_reference(party_id) ON DELETE CASCADE,
  CONSTRAINT fk_direct_parent FOREIGN KEY (direct_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id),
  CONSTRAINT fk_ultimate_parent FOREIGN KEY (ultimate_parent_legal_entity_id) REFERENCES legal_entity(legal_entity_id)
);

CREATE INDEX idx_legal_entity_party ON legal_entity(party_id);
CREATE INDEX idx_legal_entity_name ON legal_entity(primary_legal_name);
CREATE INDEX idx_legal_entity_status ON legal_entity(status);
CREATE INDEX idx_legal_entity_created ON legal_entity(dt_created);
CREATE INDEX idx_legal_entity_deleted ON legal_entity(is_deleted) WHERE is_deleted = false;

-- 1.3 Legal Entity Numbers (Flexible identifier system)
CREATE TABLE IF NOT EXISTS legal_entity_number (
  legal_entity_reference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  is_deleted BOOLEAN DEFAULT false,
  
  identifier_type VARCHAR(100) NOT NULL,
  identifier_value VARCHAR(100) NOT NULL,
  country_code VARCHAR(2),
  
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  issued_by VARCHAR(100),
  validated_by VARCHAR(100),
  validation_status VARCHAR(50) DEFAULT 'PENDING',
  validation_date TIMESTAMPTZ,
  
  verification_document_url TEXT,
  verification_notes TEXT,
  
  CONSTRAINT fk_legal_entity FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE,
  CONSTRAINT uq_identifier UNIQUE (legal_entity_id, identifier_type, identifier_value)
);

CREATE INDEX idx_legal_entity_number_entity ON legal_entity_number(legal_entity_id);
CREATE INDEX idx_legal_entity_number_type ON legal_entity_number(identifier_type);
CREATE INDEX idx_legal_entity_number_value ON legal_entity_number(identifier_value);
CREATE INDEX idx_legal_entity_number_status ON legal_entity_number(validation_status);
CREATE INDEX idx_legal_entity_number_deleted ON legal_entity_number(is_deleted) WHERE is_deleted = false;

-- 1.4 Legal Entity Contact (Contact management)
CREATE TABLE IF NOT EXISTS legal_entity_contact (
  legal_entity_contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  is_deleted BOOLEAN DEFAULT false,
  
  contact_type VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  mobile VARCHAR(50),
  job_title VARCHAR(100),
  department VARCHAR(100),
  
  preferred_language VARCHAR(10) DEFAULT 'en',
  preferred_contact_method VARCHAR(50) DEFAULT 'EMAIL',
  
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT fk_legal_entity_contact FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
);

CREATE INDEX idx_legal_entity_contact_entity ON legal_entity_contact(legal_entity_id);
CREATE INDEX idx_legal_entity_contact_type ON legal_entity_contact(contact_type);
CREATE INDEX idx_legal_entity_contact_email ON legal_entity_contact(email);
CREATE INDEX idx_legal_entity_contact_primary ON legal_entity_contact(is_primary) WHERE is_primary = true;
CREATE INDEX idx_legal_entity_contact_active ON legal_entity_contact(is_active) WHERE is_active = true;
CREATE INDEX idx_legal_entity_contact_deleted ON legal_entity_contact(is_deleted) WHERE is_deleted = false;

-- =====================================================
-- STEP 2: CREATE ENDPOINT TABLES (MULTI-ENDPOINT SUPPORT)
-- =====================================================

-- 2.1 Legal Entity Endpoint (System endpoints)
CREATE TABLE IF NOT EXISTS legal_entity_endpoint (
  legal_entity_endpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  is_deleted BOOLEAN DEFAULT false,
  
  endpoint_name VARCHAR(255) NOT NULL,
  endpoint_url VARCHAR(500),
  endpoint_description TEXT,
  data_category VARCHAR(100),
  
  endpoint_type VARCHAR(50) DEFAULT 'REST_API',
  authentication_method VARCHAR(50),
  
  last_connection_test TIMESTAMPTZ,
  last_connection_status VARCHAR(50),
  connection_test_details JSONB,
  
  is_active BOOLEAN DEFAULT true,
  activation_date TIMESTAMPTZ,
  deactivation_date TIMESTAMPTZ,
  deactivation_reason TEXT,
  
  CONSTRAINT fk_legal_entity_endpoint FOREIGN KEY (legal_entity_id) REFERENCES legal_entity(legal_entity_id) ON DELETE CASCADE
);

CREATE INDEX idx_legal_entity_endpoint_entity ON legal_entity_endpoint(legal_entity_id);
CREATE INDEX idx_legal_entity_endpoint_category ON legal_entity_endpoint(data_category);
CREATE INDEX idx_legal_entity_endpoint_active ON legal_entity_endpoint(is_active) WHERE is_active = true;
CREATE INDEX idx_legal_entity_endpoint_deleted ON legal_entity_endpoint(is_deleted) WHERE is_deleted = false;

-- 2.2 Endpoint Authorization (Token per endpoint)
CREATE TABLE IF NOT EXISTS endpoint_authorization (
  endpoint_authorization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_endpoint_id UUID NOT NULL,
  dt_created TIMESTAMPTZ DEFAULT NOW(),
  dt_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  is_deleted BOOLEAN DEFAULT false,
  
  token_value TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'BVAD',
  token_hash VARCHAR(255),
  
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  
  issued_by VARCHAR(100),
  issued_by_user_id UUID,
  
  CONSTRAINT fk_endpoint_authorization FOREIGN KEY (legal_entity_endpoint_id) REFERENCES legal_entity_endpoint(legal_entity_endpoint_id) ON DELETE CASCADE
);

CREATE INDEX idx_endpoint_authorization_endpoint ON endpoint_authorization(legal_entity_endpoint_id);
CREATE INDEX idx_endpoint_authorization_active ON endpoint_authorization(is_active) WHERE is_active = true;
CREATE INDEX idx_endpoint_authorization_expires ON endpoint_authorization(expires_at);
CREATE INDEX idx_endpoint_authorization_deleted ON endpoint_authorization(is_deleted) WHERE is_deleted = false;

-- =====================================================
-- STEP 3: CREATE VIEWS
-- =====================================================

-- 3.1 Backward compatibility view
CREATE OR REPLACE VIEW members_view AS
SELECT 
  le.legal_entity_id::text as org_id,
  le.primary_legal_name as legal_name,
  MAX(CASE WHEN len.identifier_type = 'LEI' THEN len.identifier_value END) as lei,
  MAX(CASE WHEN len.identifier_type = 'KVK' THEN len.identifier_value END) as kvk,
  le.domain,
  le.status,
  le.membership_level,
  le.dt_created as created_at,
  le.metadata
FROM legal_entity le
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id
WHERE le.is_deleted = false
GROUP BY le.legal_entity_id, le.primary_legal_name, le.domain, le.status, 
         le.membership_level, le.dt_created, le.metadata;

-- 3.2 Full entity view
CREATE OR REPLACE VIEW legal_entity_full AS
SELECT 
  le.legal_entity_id,
  le.party_id,
  pr.party_class,
  pr.party_type,
  le.primary_legal_name,
  le.address_line1,
  le.address_line2,
  le.postal_code,
  le.city,
  le.province,
  le.country_code,
  le.entity_legal_form,
  le.registered_at,
  le.domain,
  le.status,
  le.membership_level,
  le.dt_created,
  le.dt_modified,
  le.created_by,
  le.modified_by,
  
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'type', len.identifier_type,
        'value', len.identifier_value,
        'country', len.country_code,
        'status', len.validation_status
      )
    ) FILTER (WHERE len.legal_entity_reference_id IS NOT NULL),
    '[]'
  ) as identifiers,
  
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', lec.legal_entity_contact_id,
        'type', lec.contact_type,
        'name', lec.full_name,
        'email', lec.email,
        'phone', lec.phone,
        'is_primary', lec.is_primary
      )
    ) FILTER (WHERE lec.legal_entity_contact_id IS NOT NULL),
    '[]'
  ) as contacts,
  
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', lee.legal_entity_endpoint_id,
        'name', lee.endpoint_name,
        'url', lee.endpoint_url,
        'category', lee.data_category,
        'is_active', lee.is_active
      )
    ) FILTER (WHERE lee.legal_entity_endpoint_id IS NOT NULL),
    '[]'
  ) as endpoints

FROM legal_entity le
JOIN party_reference pr ON le.party_id = pr.party_id
LEFT JOIN legal_entity_number len ON le.legal_entity_id = len.legal_entity_id AND len.is_deleted = false
LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id AND lec.is_deleted = false
LEFT JOIN legal_entity_endpoint lee ON le.legal_entity_id = lee.legal_entity_id AND lee.is_deleted = false
WHERE le.is_deleted = false
GROUP BY le.legal_entity_id, le.party_id, pr.party_class, pr.party_type, 
         le.primary_legal_name, le.address_line1, le.address_line2, le.postal_code,
         le.city, le.province, le.country_code, le.entity_legal_form, le.registered_at,
         le.domain, le.status, le.membership_level, le.dt_created, le.dt_modified,
         le.created_by, le.modified_by;

-- =====================================================
-- STEP 4: CREATE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dt_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_party_reference_modified
  BEFORE UPDATE ON party_reference
  FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_legal_entity_modified
  BEFORE UPDATE ON legal_entity
  FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_legal_entity_number_modified
  BEFORE UPDATE ON legal_entity_number
  FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_legal_entity_contact_modified
  BEFORE UPDATE ON legal_entity_contact
  FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_legal_entity_endpoint_modified
  BEFORE UPDATE ON legal_entity_endpoint
  FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER trg_endpoint_authorization_modified
  BEFORE UPDATE ON endpoint_authorization
  FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration completed successfully!' as status;
