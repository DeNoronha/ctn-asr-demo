import axios from 'axios';
import { msalInstance } from '../auth/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

// Helper function to get access token
async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read'],
        account: accounts[0],
      });
      return response.accessToken;
    }
  } catch (error) {
    console.error('Failed to acquire token:', error);
  }
  return null;
}

// Create axios instance with authentication
async function getAuthenticatedAxios() {
  const token = await getAccessToken();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// =====================================================
// TYPE DEFINITIONS (Enhanced Schema)
// =====================================================

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
  identifier_type: 'LEI' | 'KVK' | 'EORI' | 'VAT' | 'DUNS' | 'EUID' | 'HRB' | 'HRA' | 'KBO' | 'SIREN' | 'SIRET' | 'CRN' | 'OTHER';
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
  connection_test_details?: any;
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
  metadata?: any;
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
  domain: string;
  status: string;
  membership_level: string;
  created_at: string;
  updated_at?: string;
  metadata?: any;
  legal_entity_id?: string;
  legal_entity?: LegalEntity;
}

interface MembersResponse {
  data: Member[];
  count: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// =====================================================
// API SERVICE (V2 with Enhanced Schema Support)
// =====================================================

export const apiV2 = {
  // =====================================================
  // LEGACY ENDPOINTS (V1 - Backward Compatibility)
  // =====================================================

  async getMembers(): Promise<Member[]> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<MembersResponse>(`/members`);
    return response.data.data;
  },

  async getMember(orgId: string): Promise<Member> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<Member>(`/members/${orgId}`);
    return response.data;
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    const response = await axios.post<Member>(`${API_BASE_URL}/members`, member);
    return response.data;
  },

  async issueToken(orgId: string): Promise<{ access_token: string }> {
    const response = await axios.post<TokenResponse>(`${API_BASE_URL}/oauth/token`, {
      org_id: orgId,
    });
    return response.data;
  },

  // =====================================================
  // LEGAL ENTITY ENDPOINTS (Core Entity Management)
  // =====================================================

  async getLegalEntity(legalEntityId: string): Promise<LegalEntity> {
    const axiosInstance = await getAuthenticatedAxios();
    const response = await axiosInstance.get<LegalEntity>(
      `/legal-entities/${legalEntityId}`
    );
    return response.data;
  },

  async createLegalEntity(entity: Partial<LegalEntity>): Promise<LegalEntity> {
    const response = await axios.post<LegalEntity>(`${API_BASE_URL}/legal-entities`, entity);
    return response.data;
  },

  async updateLegalEntity(legalEntityId: string, data: Partial<LegalEntity>): Promise<LegalEntity> {
    const response = await axios.put<LegalEntity>(
      `${API_BASE_URL}/legal-entities/${legalEntityId}`,
      data
    );
    return response.data;
  },

  async deleteLegalEntity(legalEntityId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/legal-entities/${legalEntityId}`);
  },

  async listLegalEntities(): Promise<LegalEntity[]> {
    const response = await axios.get<LegalEntity[]>(`${API_BASE_URL}/legal-entities`);
    return response.data;
  },

  // =====================================================
  // IDENTIFIER ENDPOINTS (LEI, KVK, etc.)
  // =====================================================

  async getIdentifiers(legalEntityId: string): Promise<LegalEntityIdentifier[]> {
    const response = await axios.get<LegalEntityIdentifier[]>(
      `${API_BASE_URL}/entities/${legalEntityId}/identifiers`
    );
    return response.data;
  },

  async addIdentifier(
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ): Promise<LegalEntityIdentifier> {
    const response = await axios.post<LegalEntityIdentifier>(
      `${API_BASE_URL}/entities/${identifier.legal_entity_id}/identifiers`,
      identifier
    );
    return response.data;
  },

  async updateIdentifier(
    identifierId: string,
    data: Partial<LegalEntityIdentifier>
  ): Promise<LegalEntityIdentifier> {
    const response = await axios.put<LegalEntityIdentifier>(
      `${API_BASE_URL}/identifiers/${identifierId}`,
      data
    );
    return response.data;
  },

  async deleteIdentifier(identifierId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/identifiers/${identifierId}`);
  },

  async validateIdentifier(identifierId: string): Promise<{ valid: boolean; details?: any }> {
    const response = await axios.post<{ valid: boolean; details?: any }>(
      `${API_BASE_URL}/identifiers/${identifierId}/validate`
    );
    return response.data;
  },

  // =====================================================
  // CONTACT ENDPOINTS
  // =====================================================

  async getContacts(legalEntityId: string): Promise<LegalEntityContact[]> {
    const response = await axios.get<LegalEntityContact[]>(
      `${API_BASE_URL}/legal-entities/${legalEntityId}/contacts`
    );
    return response.data;
  },

  async addContact(
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityContact> {
    const response = await axios.post<LegalEntityContact>(`${API_BASE_URL}/contacts`, contact);
    return response.data;
  },

  async updateContact(
    contactId: string,
    data: Partial<LegalEntityContact>
  ): Promise<LegalEntityContact> {
    const response = await axios.put<LegalEntityContact>(
      `${API_BASE_URL}/contacts/${contactId}`,
      data
    );
    return response.data;
  },

  async deleteContact(contactId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/contacts/${contactId}`);
  },

  // =====================================================
  // ENDPOINT ENDPOINTS (Multi-System Support)
  // =====================================================

  async getEndpoints(legalEntityId: string): Promise<LegalEntityEndpoint[]> {
    const response = await axios.get<LegalEntityEndpoint[]>(
      `${API_BASE_URL}/entities/${legalEntityId}/endpoints`
    );
    return response.data;
  },

  async addEndpoint(
    endpoint: Omit<LegalEntityEndpoint, 'legal_entity_endpoint_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityEndpoint> {
    const response = await axios.post<LegalEntityEndpoint>(
      `${API_BASE_URL}/entities/${endpoint.legal_entity_id}/endpoints`,
      endpoint
    );
    return response.data;
  },

  async updateEndpoint(
    endpointId: string,
    data: Partial<LegalEntityEndpoint>
  ): Promise<LegalEntityEndpoint> {
    const response = await axios.put<LegalEntityEndpoint>(
      `${API_BASE_URL}/endpoints/${endpointId}`,
      data
    );
    return response.data;
  },

  async deleteEndpoint(endpointId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/endpoints/${endpointId}`);
  },

  async testEndpointConnection(
    endpointId: string
  ): Promise<{ success: boolean; message?: string; details?: any }> {
    const response = await axios.post<{ success: boolean; message?: string; details?: any }>(
      `${API_BASE_URL}/endpoints/${endpointId}/test`
    );
    return response.data;
  },

  async toggleEndpoint(endpointId: string, isActive: boolean): Promise<LegalEntityEndpoint> {
    const response = await axios.patch<LegalEntityEndpoint>(
      `${API_BASE_URL}/endpoints/${endpointId}/toggle`,
      { is_active: isActive }
    );
    return response.data;
  },

  // =====================================================
  // TOKEN ENDPOINTS (Per-Endpoint Authorization)
  // =====================================================

  async getEndpointTokens(endpointId: string): Promise<EndpointAuthorization[]> {
    const response = await axios.get<EndpointAuthorization[]>(
      `${API_BASE_URL}/endpoints/${endpointId}/tokens`
    );
    return response.data;
  },

  async issueEndpointToken(
    endpointId: string,
    options?: { expires_in_days?: number }
  ): Promise<EndpointAuthorization> {
    const response = await axios.post<EndpointAuthorization>(
      `${API_BASE_URL}/endpoints/${endpointId}/tokens`,
      options
    );
    return response.data;
  },

  async revokeEndpointToken(tokenId: string, reason?: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/tokens/${tokenId}/revoke`, { reason });
  },

  async getTokenUsageStats(
    tokenId: string
  ): Promise<{ usage_count: number; last_used_at?: string }> {
    const response = await axios.get<{ usage_count: number; last_used_at?: string }>(
      `${API_BASE_URL}/tokens/${tokenId}/stats`
    );
    return response.data;
  },
};

// Export default for convenience
export default apiV2;
