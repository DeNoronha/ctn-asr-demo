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

// Member types
export interface Member {
  id: string;
  org_id: string;
  legal_name: string;
  lei?: string;
  kvk?: string;
  domain: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  membership_level?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  created_at: string;
  updated_at: string;
  legal_entity_id?: string;
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
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  membership_level?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
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

// Contact types
export interface Contact {
  id: string;
  email: string;
  full_name: string;
  contact_type: 'PRIMARY' | 'TECHNICAL' | 'BILLING';
  is_primary: boolean;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  created_at: string;
  updated_at?: string;
}

export interface ContactRequest {
  email: string;
  name: string;
  type: 'PRIMARY' | 'TECHNICAL' | 'BILLING';
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
}

export interface UpdateContactRequest {
  email?: string;
  full_name?: string;
  contact_type?: 'PRIMARY' | 'TECHNICAL' | 'BILLING';
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
}

// Identifier types
export interface Identifier {
  id: string;
  identifier_type: 'EORI' | 'SCAC' | 'UNLOC' | 'GLN';
  identifier_value: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateIdentifierRequest {
  identifier_type: 'EORI' | 'SCAC' | 'UNLOC' | 'GLN';
  identifier_value: string;
  country_code: string;
}

export interface UpdateIdentifierRequest {
  identifier_value?: string;
  country_code?: string;
  is_active?: boolean;
}

// Endpoint types
export interface Endpoint {
  id: string;
  endpoint_url: string;
  endpoint_type: 'WEBHOOK' | 'API' | 'CALLBACK';
  is_active: boolean;
  auth_type?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateEndpointRequest {
  endpoint_url: string;
  endpoint_type: 'WEBHOOK' | 'API' | 'CALLBACK';
  auth_token?: string;
}

export interface UpdateEndpointRequest {
  endpoint_url?: string;
  endpoint_type?: 'WEBHOOK' | 'API' | 'CALLBACK';
  is_active?: boolean;
  auth_token?: string;
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

// Orchestration types
export interface Orchestration {
  id: string;
  orchestration_type: string;
  status: string;
  created_at: string;
  updated_at?: string;
  party_id: string;
  details?: Record<string, unknown>;
}

export interface CreateOrchestrationRequest {
  orchestration_type: string;
  details?: Record<string, unknown>;
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
