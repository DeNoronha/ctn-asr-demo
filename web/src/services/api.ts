import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:7071/api/v1';

export interface Contact {
  legal_entity_contact_id: string;
  legal_entity_id: string;
  dt_created: string;
  dt_modified: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
  contact_type?: 'Primary' | 'Technical' | 'Billing' | 'Support';
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  is_primary?: boolean;
}

export interface LegalEntity {
  legal_entity_id: string;
  party_id?: string;
  dt_created?: string;
  dt_modified?: string;
  created_by?: string;
  modified_by?: string;
  is_deleted?: boolean;
  primary_legal_name?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  country_code?: string;
  entity_legal_form?: string;
  registered_at?: string;
  direct_parent_legal_entity_id?: number;
  ultimate_parent_legal_entity_id?: number;
  contacts?: Contact[];
}

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

export const api = {
  async getMembers(): Promise<Member[]> {
    const response = await axios.get<MembersResponse>(`${API_BASE_URL}/members`);
    return response.data.data;
  },

  async getMember(orgId: string): Promise<Member> {
    const response = await axios.get<Member>(`${API_BASE_URL}/members/${orgId}`);
    return response.data;
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    const response = await axios.post<Member>(`${API_BASE_URL}/members`, member);
    return response.data;
  },

  async issueToken(orgId: string): Promise<{ access_token: string }> {
    const response = await axios.post<TokenResponse>(`${API_BASE_URL}/oauth/token`, { org_id: orgId });
    return response.data;
  },

  // Legal Entity / Company endpoints
  async getLegalEntity(legalEntityId: string): Promise<LegalEntity> {
    const response = await axios.get<LegalEntity>(`${API_BASE_URL}/legal-entities/${legalEntityId}`);
    return response.data;
  },

  async updateLegalEntity(legalEntityId: string, data: Partial<LegalEntity>): Promise<LegalEntity> {
    const response = await axios.put<LegalEntity>(`${API_BASE_URL}/legal-entities/${legalEntityId}`, data);
    return response.data;
  },

  // Contact endpoints
  async getContacts(legalEntityId: string): Promise<Contact[]> {
    const response = await axios.get<Contact[]>(`${API_BASE_URL}/legal-entities/${legalEntityId}/contacts`);
    return response.data;
  },

  async createContact(contact: Omit<Contact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>): Promise<Contact> {
    const response = await axios.post<Contact>(`${API_BASE_URL}/contacts`, contact);
    return response.data;
  },

  async updateContact(contactId: string, data: Partial<Contact>): Promise<Contact> {
    const response = await axios.put<Contact>(`${API_BASE_URL}/contacts/${contactId}`, data);
    return response.data;
  },

  async deleteContact(contactId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/contacts/${contactId}`);
  },
};
