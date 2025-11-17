// =====================================================
// API CLIENT - BARREL EXPORT
// =====================================================
// This file provides a clean public API for the entire API client
// Import everything from here instead of individual modules

// Import types for internal use
import type { Member, LegalEntity, LegalEntityContact } from './types';

// Export all types (both for type imports and runtime)
export {
  type PaginationMetadata,
  type Metadata,
  type ConnectionTestDetails,
  type IdentifierValidationDetails,
  type PartyReference,
  type LegalEntityIdentifier,
  type LegalEntityContact,
  type LegalEntityEndpoint,
  type EndpointAuthorization,
  type LegalEntity,
  type Member,
  type Application,
  type M2MClient,
  type VerificationRecord,
  type MembersResponse,
  type HealthCheckResponse,
  type TierInfo,
  type TierUpdateData,
} from './types';

// Export client utilities
export { getAuthenticatedAxios, getApiBaseUrl, getApiBaseUrlWithoutVersion } from './client';

// Export member operations
export { getMembers, getMember, createMember, updateMemberStatus } from './members';

// Export legal entity operations
export {
  getLegalEntity,
  createLegalEntity,
  updateLegalEntity,
  deleteLegalEntity,
  listLegalEntities,
  getKvkRegistryData,
} from './legalEntities';

// Export identifier operations
export {
  getIdentifiers,
  addIdentifier,
  updateIdentifier,
  deleteIdentifier,
  validateIdentifier,
} from './identifiers';

// Export contact operations
export { getContacts, addContact, updateContact, deleteContact } from './contacts';

// Export endpoint operations
export {
  getEndpoints,
  addEndpoint,
  updateEndpoint,
  deleteEndpoint,
  testEndpointConnection,
  toggleEndpoint,
  getEndpointTokens,
  issueEndpointToken,
  revokeEndpointToken,
  getTokenUsageStats,
} from './endpoints';

// Export application operations
export { getApplications, approveApplication, rejectApplication } from './applications';

// Export M2M client operations
export {
  getM2MClients,
  createM2MClient,
  generateM2MClientSecret,
  deleteM2MClient,
} from './m2mClients';

// Export verification operations
export { getVerificationRecords, uploadVerificationDocument } from './verification';

// Export task operations
export { getAdminTasks, getKvkReviewTasks, reviewKvkVerification } from './tasks';

// Export health operations
export { getHealthStatus } from './health';

// Export tier operations
export { getTierInfo, updateTier } from './tier';

// =====================================================
// BACKWARD COMPATIBILITY OBJECT (Legacy apiV2 interface)
// =====================================================
// This object maintains the exact same interface as the old apiV2 export
// Components can continue to use apiV2.getMembers(), apiV2.getLegalEntity(), etc.

import * as members from './members';
import * as legalEntities from './legalEntities';
import * as identifiers from './identifiers';
import * as contacts from './contacts';
import * as endpoints from './endpoints';
import * as applications from './applications';
import * as m2mClients from './m2mClients';
import * as verification from './verification';
import * as tasks from './tasks';
import * as health from './health';
import * as tier from './tier';

export const apiV2 = {
  // Member operations
  ...members,

  // Legal entity operations
  ...legalEntities,

  // Identifier operations
  ...identifiers,

  // Contact operations
  ...contacts,

  // Endpoint operations
  ...endpoints,

  // Application operations
  ...applications,

  // M2M client operations
  ...m2mClients,

  // Verification operations
  ...verification,

  // Task operations
  ...tasks,

  // Health operations
  ...health,

  // Tier operations
  ...tier,
};

// =====================================================
// LEGACY API OBJECT (V1 Compatibility)
// =====================================================
// This object provides the old 'api' interface that some components still use
// It delegates to apiV2 internally

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

// Default export for backward compatibility
export default apiV2;
