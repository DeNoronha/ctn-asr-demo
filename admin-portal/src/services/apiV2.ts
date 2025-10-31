import axios from 'axios';
import { msalInstance } from '../auth/AuthContext';
import { csrfService } from './csrfService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

// Helper function to get access token
async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
      const response = await msalInstance.acquireTokenSilent({
        scopes: [`api://${clientId}/access_as_user`],
        account: accounts[0],
      });
      return response.accessToken;
    }
  } catch (error) {
    console.error('Failed to acquire token:', error);
  }
  return null;
}

// Create axios instance with authentication and CSRF protection (SEC-004)
async function getAuthenticatedAxios() {
  const token = await getAccessToken();
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Add CSRF header to state-changing requests (POST, PUT, PATCH, DELETE)
  instance.interceptors.request.use((config) => {
    const method = config.method?.toLowerCase();
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      let csrfToken = csrfService.getToken();
      if (!csrfToken) {
        csrfToken = csrfService.generateToken();
      }
      if (csrfToken && config.headers) {
        config.headers[csrfService.getHeaderName()] = csrfToken;
      }
    }
    return config;
  });

  return instance;
}

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
  contact_type: 'PRIMARY' | 'TECHNICAL' | 'BILLING' | 'SUPPORT' | 'COMPLIANCE' | 'ADMIN';
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
  membership_level?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
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

interface MembersResponse {
  data: Member[];
  count: number;
}

// =====================================================
// API SERVICE (V2 with Enhanced Schema Support)
// =====================================================

export const apiV2 = {
  // =====================================================
  // LEGACY ENDPOINTS (V1 - Backward Compatibility)
  // =====================================================

  async getMembers(page = 1, pageSize = 20): Promise<{ data: Member[]; total: number }> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<{
      data: Member[];
      pagination: { total: number; page: number; page_size: number };
    }>('/all-members', {
      params: { page, page_size: pageSize },
    });
    return {
      data: response.data.data,
      total: response.data.pagination?.total || response.data.data.length,
    };
  },

  async getMember(orgId: string): Promise<Member> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<Member>(`/members/${orgId}`);
    return response.data;
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<Member>('/members', member);
    return response.data;
  },

  // =====================================================
  // LEGAL ENTITY ENDPOINTS (Core Entity Management)
  // =====================================================

  async getLegalEntity(legalEntityId: string): Promise<LegalEntity> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<LegalEntity>(`/legal-entities/${legalEntityId}`);
    return response.data;
  },

  async createLegalEntity(entity: Partial<LegalEntity>): Promise<LegalEntity> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<LegalEntity>('/legal-entities', entity);
    return response.data;
  },

  async updateLegalEntity(legalEntityId: string, data: Partial<LegalEntity>): Promise<LegalEntity> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.put<LegalEntity>(`/legal-entities/${legalEntityId}`, data);
    return response.data;
  },

  async deleteLegalEntity(legalEntityId: string): Promise<void> {
    const axiosInstance = await getAuthenticatedAxios();
    await axiosInstance.delete(`/legal-entities/${legalEntityId}`);
  },

  async listLegalEntities(): Promise<LegalEntity[]> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<LegalEntity[]>('/legal-entities');
    return response.data;
  },

  // =====================================================
  // IDENTIFIER ENDPOINTS (LEI, KVK, etc.)
  // =====================================================

  async getIdentifiers(legalEntityId: string): Promise<LegalEntityIdentifier[]> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<{ data: LegalEntityIdentifier[]; pagination: PaginationMetadata }>(
      `/entities/${legalEntityId}/identifiers`
    );
    return response.data.data; // Extract the data array from paginated response
  },

  async addIdentifier(
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ): Promise<LegalEntityIdentifier> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<LegalEntityIdentifier>(
      `/entities/${identifier.legal_entity_id}/identifiers`,
      identifier
    );
    return response.data;
  },

  async updateIdentifier(
    identifierId: string,
    data: Partial<LegalEntityIdentifier>
  ): Promise<LegalEntityIdentifier> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.put<LegalEntityIdentifier>(
      `/identifiers/${identifierId}`,
      data
    );
    return response.data;
  },

  async deleteIdentifier(identifierId: string): Promise<void> {
    const axiosInstance = await getAuthenticatedAxios();
    await axiosInstance.delete(`/identifiers/${identifierId}`);
  },

  async validateIdentifier(identifierId: string): Promise<{ valid: boolean; details?: IdentifierValidationDetails }> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<{ valid: boolean; details?: IdentifierValidationDetails }>(
      `/identifiers/${identifierId}/validate`
    );
    return response.data;
  },

  // =====================================================
  // CONTACT ENDPOINTS
  // =====================================================

  async getContacts(legalEntityId: string): Promise<LegalEntityContact[]> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<{ data: LegalEntityContact[]; pagination: PaginationMetadata }>(
      `/legal-entities/${legalEntityId}/contacts`
    );
    return response.data.data; // Extract data array from paginated response
  },

  async addContact(
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityContact> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<LegalEntityContact>('/contacts', contact);
    return response.data;
  },

  async updateContact(
    contactId: string,
    data: Partial<LegalEntityContact>
  ): Promise<LegalEntityContact> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.put<LegalEntityContact>(`/contacts/${contactId}`, data);
    return response.data;
  },

  async deleteContact(contactId: string): Promise<void> {
    const axiosInstance = await getAuthenticatedAxios();
    await axiosInstance.delete(`/contacts/${contactId}`);
  },

  // =====================================================
  // ENDPOINT ENDPOINTS (Multi-System Support)
  // =====================================================

  async getEndpoints(legalEntityId: string): Promise<LegalEntityEndpoint[]> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<LegalEntityEndpoint[]>(
      `/legal-entities/${legalEntityId}/endpoints`
    );
    return response.data;
  },

  async addEndpoint(
    endpoint: Omit<LegalEntityEndpoint, 'legal_entity_endpoint_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityEndpoint> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<LegalEntityEndpoint>(
      `/legal-entities/${endpoint.legal_entity_id}/endpoints`,
      endpoint
    );
    return response.data;
  },

  async updateEndpoint(
    endpointId: string,
    data: Partial<LegalEntityEndpoint>
  ): Promise<LegalEntityEndpoint> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.put<LegalEntityEndpoint>(`/endpoints/${endpointId}`, data);
    return response.data;
  },

  async deleteEndpoint(endpointId: string): Promise<void> {
    const axiosInstance = await getAuthenticatedAxios();
    await axiosInstance.delete(`/endpoints/${endpointId}`);
  },

  async testEndpointConnection(
    endpointId: string
  ): Promise<{ success: boolean; message?: string; details?: ConnectionTestDetails }> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<{
      success: boolean;
      message?: string;
      details?: ConnectionTestDetails;
    }>(`/endpoints/${endpointId}/test`);
    return response.data;
  },

  async toggleEndpoint(endpointId: string, isActive: boolean): Promise<LegalEntityEndpoint> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.patch<LegalEntityEndpoint>(
      `/endpoints/${endpointId}/toggle`,
      { is_active: isActive }
    );
    return response.data;
  },

  // =====================================================
  // TOKEN ENDPOINTS (Per-Endpoint Authorization)
  // =====================================================

  async getEndpointTokens(endpointId: string): Promise<EndpointAuthorization[]> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<EndpointAuthorization[]>(
      `/endpoints/${endpointId}/tokens`
    );
    return response.data;
  },

  async issueEndpointToken(
    endpointId: string,
    options?: { expires_in_days?: number }
  ): Promise<EndpointAuthorization> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.post<EndpointAuthorization>(
      `/endpoints/${endpointId}/tokens`,
      options
    );
    return response.data;
  },

  async revokeEndpointToken(tokenId: string, reason?: string): Promise<void> {
    const axiosInstance = await getAuthenticatedAxios();
    await axiosInstance.post(`/tokens/${tokenId}/revoke`, { reason });
  },

  async getTokenUsageStats(
    tokenId: string
  ): Promise<{ usage_count: number; last_used_at?: string }> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<{ usage_count: number; last_used_at?: string }>(
      `/tokens/${tokenId}/stats`
    );
    return response.data;
  },

  // =====================================================
  // KVK REGISTRY DATA
  // =====================================================

  async getKvkRegistryData(legalEntityId: string): Promise<any> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get(`/legal-entities/${legalEntityId}/kvk-registry-data`);
    return response.data;
  },

  // =====================================================
  // TIER MANAGEMENT (Three-Tier Authentication)
  // =====================================================

  async getTierInfo(legalEntityId: string): Promise<{
    tier: number;
    method: string;
    verifiedAt?: string;
    reverificationDue?: string;
    eherkenningLevel?: string;
  }> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<{
      tier: number;
      method: string;
      verifiedAt?: string;
      reverificationDue?: string;
      eherkenningLevel?: string;
    }>(`/entities/${legalEntityId}/tier`);
    return response.data;
  },

  async updateTier(
    legalEntityId: string,
    data: { tier: number; method: string; dnsVerifiedDomain?: string; eherkenningIdentifier?: string; eherkenningLevel?: string }
  ): Promise<void> {
    const axiosInstance = await getAuthenticatedAxios();
    await axiosInstance.put(`/entities/${legalEntityId}/tier`, data);
  },
};

// Export default for convenience
export default apiV2;
