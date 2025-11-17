// =====================================================
// TYPE DEFINITIONS (Enhanced Schema)
// =====================================================

/**
 * Pagination metadata for API responses
 */
export interface PaginationMetadata {
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

/**
 * Generic metadata object for extensible data storage
 * Used for storing additional context-specific information
 */
export interface Metadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Connection test result details
 */
export interface ConnectionTestDetails {
  status_code?: number;
  response_time_ms?: number;
  error_message?: string;
  tested_at?: string;
  tested_by?: string;
  connection_type?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Identifier validation details
 */
export interface IdentifierValidationDetails {
  registry_response?: string;
  validation_errors?: string[];
  validated_fields?: string[];
  confidence_score?: number;
  [key: string]: string | number | boolean | string[] | null | undefined;
}

export interface PartyReference {
  party_id: string;
  dt_created: string;
  dt_modified: string;
  created_by?: string;
  modified_by?: string;
  is_deleted: boolean;
  party_class?: string;
  party_type?: string;
}

export interface LegalEntityIdentifier {
  legal_entity_reference_id?: string;
  legal_entity_id: string;
  identifier_type:
    | 'LEI'
    | 'KVK'
    | 'EORI'
    | 'VAT'
    | 'DUNS'
    | 'EUID'
    | 'HRB'
    | 'HRA'
    | 'KBO'
    | 'SIREN'
    | 'SIRET'
    | 'CRN'
    | 'OTHER';
  identifier_value: string;
  country_code?: string;
  registry_name?: string;
  registry_url?: string;
  valid_from?: string;
  valid_to?: string;
  issued_by?: string;
  validated_by?: string;
  validation_status?: 'PENDING' | 'VALIDATED' | 'FAILED' | 'EXPIRED';
  validation_date?: string;
  verification_document_url?: string;
  verification_notes?: string;
  dt_created?: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
}

export interface LegalEntityContact {
  legal_entity_contact_id?: string;
  legal_entity_id: string;
  contact_type: 'PRIMARY' | 'TECHNICAL' | 'BILLING' | 'SUPPORT' | 'LEGAL' | 'OTHER';
  full_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  preferred_language?: string;
  preferred_contact_method?: 'EMAIL' | 'PHONE' | 'SMS';
  is_primary?: boolean;
  is_active?: boolean;
  dt_created?: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
}

export interface LegalEntityEndpoint {
  legal_entity_endpoint_id?: string;
  legal_entity_id: string;
  endpoint_name: string;
  endpoint_url?: string;
  endpoint_description?: string;
  data_category?: 'CONTAINER' | 'CUSTOMS' | 'WAREHOUSE' | 'TRANSPORT' | 'OTHER';
  endpoint_type?: 'REST_API' | 'SOAP' | 'WEBHOOK' | 'SFTP' | 'OTHER';
  authentication_method?: string;
  last_connection_test?: string;
  last_connection_status?: string;
  connection_test_details?: ConnectionTestDetails;
  is_active?: boolean;
  activation_date?: string;
  deactivation_date?: string;
  deactivation_reason?: string;
  dt_created?: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
}

export interface EndpointAuthorization {
  endpoint_authorization_id?: string;
  legal_entity_endpoint_id: string;
  token_value: string;
  token_type?: string;
  token_hash?: string;
  issued_at?: string;
  expires_at?: string;
  revoked_at?: string;
  revocation_reason?: string;
  is_active?: boolean;
  last_used_at?: string;
  usage_count?: number;
  issued_by?: string;
  issued_by_user_id?: string;
  dt_created?: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
}

export interface LegalEntity {
  legal_entity_id?: string;
  party_id?: string;
  primary_legal_name: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  country_code?: string;
  entity_legal_form?: string;
  registered_at?: string;
  direct_parent_legal_entity_id?: string;
  ultimate_parent_legal_entity_id?: string;
  domain?: string;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  membership_level?: 'BASIC' | 'FULL' | 'PREMIUM';
  metadata?: Metadata;
  dt_created?: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;

  // Aggregated fields from view
  identifiers?: LegalEntityIdentifier[];
  contacts?: LegalEntityContact[];
  endpoints?: LegalEntityEndpoint[];
}

// Backward compatibility type
export interface Member {
  org_id: string;
  legal_name: string;
  lei?: string;
  kvk?: string;
  euid?: string;
  domain: string;
  status: string;
  membership_level: string;
  created_at: string;
  updated_at?: string;
  metadata?: Metadata;
  legal_entity_id?: string;
  legal_entity?: LegalEntity;
}

export interface Application {
  application_id: string;
  legal_name: string;
  kvk_number?: string;
  company_address: string;
  postal_code: string;
  city: string;
  country: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  job_title?: string;
  membership_type: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface M2MClient {
  m2m_client_id: string;
  legal_entity_id: string;
  client_name: string;
  azure_client_id: string;
  description: string;
  assigned_scopes: string[];
  is_active: boolean;
  dt_created: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
}

export interface VerificationRecord {
  verification_id: string;
  identifier_type: string;
  identifier_value: string;
  document_url: string | null;
  verification_status: 'pending' | 'verified' | 'failed' | 'flagged';
  verified_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  uploaded_at: string;
  extracted_data: Record<string, string> | null;
  mismatch_flags: string[] | null;
}

export interface MembersResponse {
  data: Member[];
  count: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; responseTime?: number; error?: string; details?: any };
    applicationInsights: { status: 'up' | 'down'; error?: string; details?: any };
    azureKeyVault: { status: 'up' | 'down'; responseTime?: number; error?: string };
    staticWebApps: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
      details?: any;
    };
  };
}

export interface TierInfo {
  tier: number;
  method: string;
  verifiedAt?: string;
  reverificationDue?: string;
  eherkenningLevel?: string;
}

export interface TierUpdateData {
  tier: number;
  method: string;
  dnsVerifiedDomain?: string;
  eherkenningIdentifier?: string;
  eherkenningLevel?: string;
}
