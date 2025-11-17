import { getAuthenticatedAxios } from './client';

// ========================================================================
// TASK MANAGEMENT (Admin)
// ========================================================================

export async function getAdminTasks(): Promise<{ tasks: any[] }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{ tasks: any[] }>('/admin/tasks');
  return response.data;
}

export async function getKvkReviewTasks(): Promise<any[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<any[]>('/admin/kvk-verification/flagged-entities');
  return response.data;
}

export async function reviewKvkVerification(data: {
  legal_entity_id: string;
  decision: 'approve' | 'reject';
  reviewer_notes: string;
}): Promise<any> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post('/admin/kvk-verification/review', data);
  return response.data;
}
