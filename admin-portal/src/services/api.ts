// =====================================================
// LEGACY API SERVICE (V1)
// This file maintains backward compatibility
// For new features, use apiV2.ts
// =====================================================

import axios from 'axios';
import { type LegalEntity, type LegalEntityContact, type Member, apiV2 } from './apiV2';

const _API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

// Re-export types for backward compatibility
export type { LegalEntity, LegalEntityContact, Member };

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

// Legacy API - delegates to apiV2
export const api = {
  async getMembers(
    page?: number,
    pageSize?: number
  ): Promise<Member[] | { data: Member[]; total: number }> {
    // If pagination params provided, return paginated result
    if (page !== undefined || pageSize !== undefined) {
      return apiV2.getMembers(page || 1, pageSize || 20);
    }
    // Otherwise, fetch all members for backward compatibility
    const result = await apiV2.getMembers(1, 9999);
    return result.data;
  },

  async getMember(orgId: string): Promise<Member> {
    return apiV2.getMember(orgId);
  },

  async createMember(member: Partial<Member>): Promise<Member> {
    return apiV2.createMember(member);
  },

  async issueToken(orgId: string): Promise<{ access_token: string }> {
    return apiV2.issueToken(orgId);
  },

  // Legal Entity / Company endpoints
  async getLegalEntity(legalEntityId: string): Promise<LegalEntity> {
    return apiV2.getLegalEntity(legalEntityId);
  },

  async updateLegalEntity(legalEntityId: string, data: Partial<LegalEntity>): Promise<LegalEntity> {
    return apiV2.updateLegalEntity(legalEntityId, data);
  },

  // Contact endpoints
  async getContacts(legalEntityId: string): Promise<LegalEntityContact[]> {
    return apiV2.getContacts(legalEntityId);
  },

  async createContact(
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityContact> {
    return apiV2.addContact(contact);
  },

  async updateContact(
    contactId: string,
    data: Partial<LegalEntityContact>
  ): Promise<LegalEntityContact> {
    return apiV2.updateContact(contactId, data);
  },

  async deleteContact(contactId: string): Promise<void> {
    return apiV2.deleteContact(contactId);
  },
};

// Re-export apiV2 for direct access to new features
export { apiV2 };
export default api;
