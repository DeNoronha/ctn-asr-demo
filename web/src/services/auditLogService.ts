/**
 * Audit Log Service
 * Tracks all user actions for security and compliance
 */

export enum AuditAction {
  // User Management
  USER_INVITED = 'USER_INVITED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ENABLED = 'USER_ENABLED',
  USER_DISABLED = 'USER_DISABLED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  
  // Member Management
  MEMBER_CREATED = 'MEMBER_CREATED',
  MEMBER_UPDATED = 'MEMBER_UPDATED',
  MEMBER_DELETED = 'MEMBER_DELETED',
  MEMBER_STATUS_CHANGED = 'MEMBER_STATUS_CHANGED',
  
  // Token Management
  TOKEN_ISSUED = 'TOKEN_ISSUED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Authentication
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  
  // System
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  DATA_EXPORTED = 'DATA_EXPORTED',
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  targetType: string; // 'user', 'member', 'token', 'system'
  targetId?: string;
  targetName?: string;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

class AuditLogService {
  private logs: AuditLog[] = [];

  /**
   * Log an action
   */
  log(params: {
    action: AuditAction;
    userId: string;
    userName: string;
    userRole: string;
    targetType: string;
    targetId?: string;
    targetName?: string;
    details: string;
    metadata?: Record<string, any>;
  }): void {
    const logEntry: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      action: params.action,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      details: params.details,
      metadata: params.metadata,
      ipAddress: this.getClientIp(),
    };

    this.logs.unshift(logEntry); // Add to beginning for most recent first
    
    // Store in localStorage for persistence (in production, send to API)
    this.persistLogs();
    
    console.log('[AUDIT]', logEntry);
  }

  /**
   * Get all logs
   */
  getLogs(): AuditLog[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by criteria
   */
  getFilteredLogs(filters: {
    userId?: string;
    action?: AuditAction;
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
  }): AuditLog[] {
    let filtered = this.logs;

    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.targetType) {
      filtered = filtered.filter(log => log.targetType === filters.targetType);
    }

    if (filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }

    return filtered;
  }

  /**
   * Get logs for a specific user
   */
  getUserLogs(userId: string): AuditLog[] {
    return this.logs.filter(log => log.userId === userId);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 50): AuditLog[] {
    return this.logs.slice(0, count);
  }

  /**
   * Clear all logs (use with caution)
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('audit_logs');
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Private methods

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIp(): string {
    // In a real app, get from request headers via API
    return 'localhost';
  }

  private persistLogs(): void {
    try {
      // Keep only last 1000 logs in localStorage
      const logsToStore = this.logs.slice(0, 1000);
      localStorage.setItem('audit_logs', JSON.stringify(logsToStore));
    } catch (error) {
      console.error('Failed to persist audit logs:', error);
    }
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem('audit_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  }

  // Initialize on creation
  constructor() {
    this.loadLogs();
  }
}

// Singleton instance
export const auditLogService = new AuditLogService();
