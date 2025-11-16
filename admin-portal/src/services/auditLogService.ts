/**
 * Audit Log Service
 * Fetches and manages audit logs from the API
 */

import axios from 'axios';
import { msalInstance } from '../auth/AuthContext';
import { logger } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

// Helper function to get access token
async function getAccessToken(): Promise<string | null> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
      const response = await msalInstance.acquireTokenSilent({
        scopes: [`api://${clientId}/access_as_user`],
        account: accounts[0],
      });
      return response.accessToken;
    }
  } catch (error) {
    logger.error('Failed to acquire token:', error);
  }
  return null;
}

export enum AuditAction {
  // User Management
  USER_INVITED = 'USER_INVITED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ENABLED = 'USER_ENABLED',
  USER_DISABLED = 'USER_DISABLED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',

  // Member Management
  MEMBER_CREATED = 'member_created',
  MEMBER_UPDATED = 'member_updated',
  MEMBER_DELETED = 'member_deleted',
  MEMBER_STATUS_CHANGED = 'MEMBER_STATUS_CHANGED',

  // Contact Management
  CONTACT_CREATED = 'contact_created',
  CONTACT_UPDATED = 'contact_updated',
  CONTACT_DELETED = 'contact_deleted',

  // Identifier Management
  IDENTIFIER_CREATED = 'identifier_created',
  IDENTIFIER_UPDATED = 'identifier_updated',
  IDENTIFIER_DELETED = 'identifier_deleted',

  // Token Management
  TOKEN_ISSUED = 'TOKEN_ISSUED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',

  // Authentication
  USER_LOGIN = 'auth_success',
  USER_LOGOUT = 'USER_LOGOUT',
  AUTH_FAILURE = 'auth_failure',

  // System
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  DATA_EXPORTED = 'data_exported',
}

// API response format from backend
export interface AuditLogResponse {
  audit_log_id: number;
  event_type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  result: 'success' | 'failure';
  user_id?: string;
  user_email?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  details?: Record<string, any>;
  error_message?: string;
  dt_created: string;
}

// Frontend-friendly format
export interface AuditLog {
  id: string;
  timestamp: Date;
  action: AuditAction | string;
  userId: string;
  userName: string;
  userRole: string;
  targetType: string; // 'user', 'member', 'token', 'system'
  targetId?: string;
  targetName?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  result?: 'success' | 'failure';
  error_message?: string;
}

export interface AuditLogFilters {
  event_type?: string;
  user_email?: string;
  resource_type?: string;
  resource_id?: string;
  result?: 'success' | 'failure';
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

class AuditLogService {
  /**
   * Fetch audit logs from API with optional filters and pagination
   */
  async fetchLogs(filters?: AuditLogFilters): Promise<PaginatedAuditLogsResponse> {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.event_type) params.append('event_type', filters.event_type);
      if (filters?.user_email) params.append('user_email', filters.user_email);
      if (filters?.resource_type) params.append('resource_type', filters.resource_type);
      if (filters?.resource_id) params.append('resource_id', filters.resource_id);
      if (filters?.result) params.append('result', filters.result);
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const url = `${API_BASE_URL}/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await axios.get<PaginatedAuditLogsResponse>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch audit logs:', error);
      throw error;
    }
  }

  /**
   * Transform API response to frontend format
   */
  transformToFrontendFormat(apiLog: AuditLogResponse): AuditLog {
    return {
      id: apiLog.audit_log_id.toString(),
      timestamp: new Date(apiLog.dt_created),
      action: apiLog.event_type as AuditAction,
      userId: apiLog.user_id || 'system',
      userName: apiLog.user_email || 'System',
      userRole: 'Unknown', // Role not stored in audit_log table
      targetType: apiLog.resource_type || 'unknown',
      targetId: apiLog.resource_id,
      targetName: apiLog.details?.name,
      details: apiLog.error_message || JSON.stringify(apiLog.details || {}),
      metadata: apiLog.details,
      ipAddress: apiLog.ip_address,
      severity: apiLog.severity,
      result: apiLog.result,
      error_message: apiLog.error_message,
    };
  }

  /**
   * Get all logs (backward compatible method)
   * Now fetches from API instead of localStorage
   */
  async getLogs(page = 1, limit = 100): Promise<AuditLog[]> {
    const response = await this.fetchLogs({ page, limit });
    return response.data.map((log) => this.transformToFrontendFormat(log));
  }

  /**
   * Get logs filtered by criteria
   */
  async getFilteredLogs(filters: {
    userId?: string;
    action?: AuditAction | string;
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const apiFilters: AuditLogFilters = {
      event_type: filters.action?.toString(),
      resource_type: filters.targetType,
      start_date: filters.startDate?.toISOString(),
      end_date: filters.endDate?.toISOString(),
      page: filters.page || 1,
      limit: filters.limit || 50,
    };

    const response = await this.fetchLogs(apiFilters);
    return {
      data: response.data.map((log) => this.transformToFrontendFormat(log)),
      total: response.pagination.totalItems,
    };
  }

  /**
   * Get logs for a specific user
   */
  async getUserLogs(userEmail: string, page = 1, limit = 50): Promise<AuditLog[]> {
    const response = await this.fetchLogs({ user_email: userEmail, page, limit });
    return response.data.map((log) => this.transformToFrontendFormat(log));
  }

  /**
   * Get recent logs
   */
  async getRecentLogs(count = 50): Promise<AuditLog[]> {
    const response = await this.fetchLogs({ page: 1, limit: count });
    return response.data.map((log) => this.transformToFrontendFormat(log));
  }

  /**
   * Export logs to JSON
   */
  async exportLogs(filters?: AuditLogFilters): Promise<string> {
    const response = await this.fetchLogs({ ...filters, limit: 10000 });
    return JSON.stringify(response.data, null, 2);
  }

  /**
   * Log an action by POSTing to the API
   * Used for operations that happen outside the ASR API (e.g., Microsoft Graph API)
   */
  async log(params: {
    action: AuditAction;
    userId: string;
    userName: string;
    userRole: string;
    targetType: string;
    targetId?: string;
    targetName?: string;
    details: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const token = await getAccessToken();
      if (!token) {
        logger.warn('[AUDIT] Cannot log audit entry - no access token');
        return;
      }

      logger.log('[AUDIT] Creating audit log entry:', params.action);

      await axios.post(`${API_BASE_URL}/audit-logs`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      logger.log('[AUDIT] Audit log entry created successfully');
    } catch (error) {
      logger.error('[AUDIT] Failed to create audit log entry:', error);
      // Don't throw - audit logging failures shouldn't break the UI
    }
  }
}

// Singleton instance
export const auditLogService = new AuditLogService();
