import { getAuthenticatedAxios } from './client';
import type { TierInfo, TierUpdateData } from './types';

// =====================================================
// TIER MANAGEMENT (Three-Tier Authentication)
// =====================================================

export async function getTierInfo(legalEntityId: string): Promise<TierInfo> {
  const axiosInstance = await getAuthenticatedAxios();
  const response = await axiosInstance.get<TierInfo>(`/entities/${legalEntityId}/tier`);
  return response.data;
}

export async function updateTier(legalEntityId: string, data: TierUpdateData): Promise<void> {
  const axiosInstance = await getAuthenticatedAxios();
  await axiosInstance.put(`/entities/${legalEntityId}/tier`, data);
}
