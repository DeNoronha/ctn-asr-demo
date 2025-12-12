import { getAuthenticatedAxios } from './client';
import type { Member, PaginationMetadata } from './types';

// =====================================================
// LEGACY ENDPOINTS (V1 - Backward Compatibility)
// =====================================================

export async function getMembers(
  page = 1,
  pageSize = 20
): Promise<{ data: Member[]; total: number }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<{
    data: Member[];
    pagination: { total: number; page: number; page_size: number };
  }>('/all-members', {
    params: { page, page_size: pageSize },
  });
  return {
    data: response.data.data,
    total: response.data.pagination?.total || response.data.data.length,
  };
}

// getMember removed (Dec 12, 2025) - endpoint dropped, was never used

export async function createMember(member: Partial<Member>): Promise<Member> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.post<Member>('/members', member);
  return response.data;
}

export async function updateMemberStatus(
  legalEntityId: string,
  status: string,
  notes?: string
): Promise<{ message: string; oldStatus: string; newStatus: string }> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.patch<{
    message: string;
    oldStatus: string;
    newStatus: string;
  }>(`/members/${legalEntityId}/status`, { status, notes });
  return response.data;
}
