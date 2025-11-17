import { getAuthenticatedAxios } from './client';
import type { VerificationRecord } from './types';

// ========================================================================
// IDENTIFIER VERIFICATION
// ========================================================================

export async function getVerificationRecords(
  legalEntityId: string
): Promise<{ verifications: VerificationRecord[] }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{ verifications: VerificationRecord[] }>(
    `/v1/legal-entities/${legalEntityId}/verifications`
  );
  return response.data;
}

export async function uploadVerificationDocument(
  legalEntityId: string,
  file: File,
  identifierType: string,
  identifierValue: string,
  identifierId: string
): Promise<any> {
  const axiosInstance = await getAuthenticatedAxios();
  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('identifier_type', identifierType);
  formData.append('identifier_value', identifierValue);
  formData.append('identifier_id', identifierId);

  const response = await axiosInstance.post(
    `/v1/legal-entities/${legalEntityId}/verifications`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}
