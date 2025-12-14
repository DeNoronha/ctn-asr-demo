// Common types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Member types (Dec 12, 2025: members table dropped - Member now maps to legal_entity via vw_legal_entities)
export interface Member {
  legal_entity_id: string;  // Primary key (was: id from members table)
  legal_name: string;       // From primary_legal_name
  lei?: string;             // Pivoted from legal_entity_number
  kvk?: string;             // Pivoted from legal_entity_number
  euid?: string;            // Pivoted from legal_entity_number
  eori?: string;            // Pivoted from legal_entity_number
  duns?: string;            // Pivoted from legal_entity_number
  domain?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  membership_level?: 'BASIC' | 'FULL' | 'PREMIUM';
  created_at: string;
  metadata?: Record<string, unknown>;
  contact_count?: number;   // From vw_legal_entities
  endpoint_count?: number;  // From vw_legal_entities
  party_id?: string;
}

export interface CreateMemberRequest {
  org_id: string;
  legal_name: string;
  domain: string;
  lei?: string;
  kvk?: string;
  contacts?: ContactRequest[];
}

export interface UpdateMemberRequest {
  legal_name?: string;
  domain?: string;
  lei?: string;
  kvk?: string;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
  membership_level?: 'BASIC' | 'FULL' | 'PREMIUM';
}

// Legal Entity types
export interface LegalEntity {
  legal_entity_id: string;
  party_id: string;
  primary_legal_name: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface UpdateLegalEntityRequest {
  primary_legal_name?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
}

// Contact types - matches legal_entity_contact table
export type ContactType = 'AUTHORIZED_REP' | 'TECHNICAL' | 'BILLING' | 'SUPPORT' | 'LEGAL' | 'OTHER';

export interface Contact {
  legal_entity_contact_id: string;
  legal_entity_id: string;
  contact_type: ContactType;
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
  first_name?: string;
  last_name?: string;
  dt_created?: string;
  dt_modified?: string;
}

export interface ContactRequest {
  contact_type: ContactType;
  full_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  preferred_language?: string;
  preferred_contact_method?: 'EMAIL' | 'PHONE' | 'SMS';
  is_primary?: boolean;
}

export interface UpdateContactRequest {
  contact_type?: ContactType;
  full_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  preferred_language?: string;
  preferred_contact_method?: 'EMAIL' | 'PHONE' | 'SMS';
  is_primary?: boolean;
  is_active?: boolean;
}

// Identifier types - matches legal_entity_number_type lookup table
export type IdentifierType =
  | 'LEI'      // Legal Entity Identifier (global, 20 chars)
  | 'KVK'      // Dutch Chamber of Commerce (8 digits)
  | 'EORI'     // EU customs identifier
  | 'VAT'      // Value Added Tax number
  | 'DUNS'     // D-U-N-S Number (9 digits)
  | 'EUID'     // European Unique Identifier
  | 'HRB'      // German commercial register (corporations)
  | 'HRA'      // German commercial register (partnerships)
  | 'KBO'      // Belgian business register (10 digits)
  | 'SIREN'    // French business identifier (9 digits)
  | 'SIRET'    // French establishment identifier (14 digits)
  | 'CRN'      // UK Company Registration Number
  | 'PEPPOL'   // Peppol network participant ID
  | 'VIES'     // VAT Information Exchange System
  | 'RSIN'     // Dutch legal entity ID (9 digits)
  | 'OTHER';

export interface Identifier {
  id: string;
  legal_entity_id: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  country_code?: string;
  registry_name?: string;
  registry_url?: string;
  valid_from?: string;
  valid_to?: string;
  issued_by?: string;
  validated_by?: string;
  validation_status?: 'PENDING' | 'VALIDATED' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  validation_date?: string;
  verification_status?: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  issuing_authority?: string;
  issued_at?: string;
  expires_at?: string;
  is_deleted?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateIdentifierRequest {
  identifier_type: IdentifierType;
  identifier_value: string;
  country_code?: string;
  issued_by?: string;
  valid_from?: string;
  valid_to?: string;
}

export interface UpdateIdentifierRequest {
  identifier_value?: string;
  country_code?: string;
  issued_by?: string;
  valid_from?: string;
  valid_to?: string;
  validation_status?: 'PENDING' | 'VALIDATED' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
}

// Endpoint types - matches legal_entity_endpoint table
export type EndpointType = 'REST' | 'REST_API' | 'SOAP' | 'WEBHOOK' | 'OTHER';

export interface Endpoint {
  legal_entity_endpoint_id: string;
  legal_entity_id: string;
  endpoint_name: string;
  endpoint_url?: string;
  endpoint_description?: string;
  data_category?: 'CONTAINER' | 'CUSTOMS' | 'WAREHOUSE' | 'TRANSPORT' | 'OTHER';
  endpoint_type?: EndpointType;
  authentication_method?: string;
  last_connection_test?: string;
  last_connection_status?: string;
  is_active?: boolean;
  activation_date?: string;
  deactivation_date?: string;
  verification_status?: 'PENDING' | 'SENT' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verification_sent_at?: string;
  verification_expires_at?: string;
  test_result_data?: Record<string, unknown>;
  dt_created?: string;
  dt_modified?: string;
}

export interface CreateEndpointRequest {
  endpoint_name: string;
  endpoint_url: string;
  endpoint_description?: string;
  data_category?: string;
  endpoint_type?: EndpointType;
  authentication_method?: string;
}

export interface UpdateEndpointRequest {
  endpoint_name?: string;
  endpoint_url?: string;
  endpoint_description?: string;
  data_category?: string;
  endpoint_type?: EndpointType;
  authentication_method?: string;
  is_active?: boolean;
}

export interface InitiateEndpointRegistrationRequest {
  endpoint_name: string;
  endpoint_url: string;
  endpoint_description?: string;
  data_category?: string;
  endpoint_type?: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface EndpointTestResult {
  success: boolean;
  tested_at: string;
  endpoint_url: string;
  response_time_ms?: number;
  status_code?: number;
  mock_response?: Record<string, unknown>;
  error?: string;
}

// Audit Log types
export interface AuditLog {
  id: number;
  event_time: string;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  user_email?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  result: 'success' | 'failure';
  ip_address?: string;
  details?: Record<string, unknown>;
}

export interface AuditLogFilters extends PaginationParams {
  event_type?: string;
  user_email?: string;
  resource_type?: string;
  resource_id?: string;
  result?: 'success' | 'failure';
  start_date?: string;
  end_date?: string;
}

// Auth types
export interface PartyInfo {
  party_id: string;
  party_name: string;
  legal_entity_id: string;
  member_name: string;
}

// API Client configuration
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  getAccessToken: () => Promise<string> | string;
  onError?: (error: Error) => void;
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}
