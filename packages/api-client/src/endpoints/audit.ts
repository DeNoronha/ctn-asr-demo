// @ts-nocheck
import * as Axios from 'axios';
import { AuditLog, AuditLogFilters, PaginatedResponse } from '../types';

export class AuditLogsEndpoint {
  constructor(private axios: Axios.AxiosInstance) {}

  /**
   * Get audit logs with optional filters
   */
  async getAll(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await this.axios.get('/audit-logs', { params: filters }) as any;
    return data as any;
  }

  /**
   * Get audit log by ID
   */
  async getById(id: number): Promise<AuditLog> {
    const { data } = await this.axios.get(`/audit-logs/${id}`) as any;
    return data as any;
  }

  /**
   * Get audit logs for a specific resource
   */
  async getByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    const { data } = await this.axios.get('/audit-logs', {
      params: {
        resource_type: resourceType,
        resource_id: resourceId
      }
    }) as any;
    return (data.data || data) as any;
  }

  /**
   * Get audit logs for a specific user
   */
  async getByUser(userEmail: string, filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await this.axios.get('/audit-logs', {
      params: {
        ...filters,
        user_email: userEmail
      }
    }) as any;
    return data as any;
  }
}
