import { getAuthenticatedAxios } from './client';
import type { Application } from './types';

// ========================================================================
// APPLICATION MANAGEMENT
// ========================================================================

export async function getApplications(
  status?: 'pending' | 'approved' | 'rejected' | 'all',
  limit?: number,
  offset?: number
): Promise<{ data: Application[]; total: number; limit: number; offset: number }> {
  const axiosInstance = await getAuthenticatedAxios();
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());

  const response = await axiosInstance.get<{
    data: Application[];
    total: number;
    limit: number;
    offset: number;
  }>(`/applications?${params.toString()}`);
  return response.data;
}

export async function approveApplication(
  applicationId: string,
  reviewNotes?: string
): Promise<{ message: string; legalEntityId: string; applicationId: string }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<{
    message: string;
    legalEntityId: string;
    applicationId: string;
  }>(`/applications/${applicationId}/approve`, { reviewNotes: reviewNotes || '' });
  return response.data;
}

export async function rejectApplication(
  applicationId: string,
  reviewNotes: string
): Promise<{ message: string; applicationId: string }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<{ message: string; applicationId: string }>(
    `/applications/${applicationId}/reject`,
    { reviewNotes }
  );
  return response.data;
}
