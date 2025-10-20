import { AxiosInstance } from 'axios';
import { AuditLog, AuditLogFilters, PaginatedResponse } from '../types';

export class AuditLogsEndpoint {
  constructor(private axios: AxiosInstance) {}

  /**
   * Get audit logs with optional filters
   */
  async getAll(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const { data } = await this.axios.get('/audit-logs', { params: filters });
    return data;
  }

  /**
   * Get audit log by ID
   */
  async getById(id: number): Promise<AuditLog> {
    const { data } = await this.axios.get(`/audit-logs/${id}`);
    return data;
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
    });
    return data.data || data;
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
    });
    return data;
  }
}
