import { getAuthenticatedAxios } from './client';
import type { LegalEntityContact, PaginationMetadata } from './types';

// =====================================================
// CONTACT ENDPOINTS
// =====================================================

export async function getContacts(legalEntityId: string): Promise<LegalEntityContact[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{
    data: LegalEntityContact[];
    pagination: PaginationMetadata;
  }>(`/legal-entities/${legalEntityId}/contacts`);
  return response.data.data; // Extract data array from paginated response
}

export async function addContact(
  contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
): Promise<LegalEntityContact> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<LegalEntityContact>('/contacts', contact);
  return response.data;
}

export async function updateContact(
  contactId: string,
  data: Partial<LegalEntityContact>
): Promise<LegalEntityContact> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.put<LegalEntityContact>(`/contacts/${contactId}`, data);
  return response.data;
}

export async function deleteContact(contactId: string): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.delete(`/contacts/${contactId}`);
}
