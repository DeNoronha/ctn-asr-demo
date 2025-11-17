import axios from 'axios';
import { getApiBaseUrlWithoutVersion } from './client';
import type { HealthCheckResponse } from './types';

// ========================================================================
// HEALTH MONITORING (Public Endpoint)
// ========================================================================

export async function getHealthStatus(): Promise<HealthCheckResponse> {
  // Health endpoint is at /api/health (not /api/v1/health), so we need a separate base URL
  const healthBaseUrl = getApiBaseUrlWithoutVersion();
  const axiosInstance = axios.create({
    baseURL: healthBaseUrl,
    headers: { Accept: 'application/json' },
  });
  const response = await axiosInstance.get<HealthCheckResponse>('/health');
  return response.data;
}
