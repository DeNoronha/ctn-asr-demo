import { getAuthenticatedAxios } from './client';

// ========================================================================
// TASK MANAGEMENT (Admin)
// ========================================================================

export async function getAdminTasks(): Promise<{ tasks: any[] }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{ tasks: any[] }>('/admin/tasks/list');
  return response.data;
}

export async function getKvkReviewTasks(): Promise<any[]> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<any[]>('/kvk-verification/flagged');
  return response.data;
}

export async function reviewKvkVerification(data: {
  legal_entity_id: string;
  decision: 'approve' | 'reject';
  reviewer_notes: string;
}): Promise<any> {
  const axiosInstance = await getAuthenticatedAxios();
  // API route: /v1/kvk-verification/:legalentityid/review (legalentityid in path)
  const response = await axiosInstance.post(`/kvk-verification/${data.legal_entity_id}/review`, {
    decision: data.decision,
    reviewer_notes: data.reviewer_notes,
  });
  return response.data;
}
