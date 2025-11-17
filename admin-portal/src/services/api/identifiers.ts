import { getAuthenticatedAxios } from './client';
import type {
  LegalEntityIdentifier,
  PaginationMetadata,
  IdentifierValidationDetails,
} from './types';

// =====================================================
// IDENTIFIER ENDPOINTS (LEI, KVK, etc.)
// =====================================================

export async function getIdentifiers(legalEntityId: string): Promise<LegalEntityIdentifier[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{
    data: LegalEntityIdentifier[];
    pagination: PaginationMetadata;
  }>(`/entities/${legalEntityId}/identifiers`);
  return response.data.data; // Extract the data array from paginated response
}

export async function addIdentifier(
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
}

export async function updateIdentifier(
  identifierId: string,
  data: Partial<LegalEntityIdentifier>
): Promise<LegalEntityIdentifier> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.put<LegalEntityIdentifier>(
    `/identifiers/${identifierId}`,
    data
  );
  return response.data;
}

export async function deleteIdentifier(identifierId: string): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.delete(`/identifiers/${identifierId}`);
}

export async function validateIdentifier(
  identifierId: string
): Promise<{ valid: boolean; details?: IdentifierValidationDetails }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<{
    valid: boolean;
    details?: IdentifierValidationDetails;
  }>(`/identifiers/${identifierId}/validate`);
  return response.data;
}
