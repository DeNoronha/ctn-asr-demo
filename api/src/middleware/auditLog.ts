// ========================================
// Audit Logging Middleware
// ========================================
// Logs all sensitive operations for security and compliance

import { InvocationContext } from '@azure/functions';
import { Pool } from 'pg';
import { AuthenticatedRequest } from './auth';

// Database connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication events
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  TOKEN_ISSUED = 'token_issued',
  TOKEN_REVOKED = 'token_revoked',

  // Member operations
  MEMBER_CREATED = 'member_created',
  MEMBER_UPDATED = 'member_updated',
  MEMBER_DELETED = 'member_deleted',
  MEMBER_ACTIVATED = 'member_activated',
  MEMBER_SUSPENDED = 'member_suspended',

  // Contact operations
  CONTACT_CREATED = 'contact_created',
  CONTACT_UPDATED = 'contact_updated',
  CONTACT_DELETED = 'contact_deleted',

  // Endpoint operations
  ENDPOINT_CREATED = 'endpoint_created',
  ENDPOINT_UPDATED = 'endpoint_updated',
  ENDPOINT_DELETED = 'endpoint_deleted',
  ENDPOINT_TOKEN_ISSUED = 'endpoint_token_issued',

  // Identifier operations
  IDENTIFIER_CREATED = 'identifier_created',
  IDENTIFIER_UPDATED = 'identifier_updated',
  IDENTIFIER_DELETED = 'identifier_deleted',

  // Document operations
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_APPROVED = 'document_approved',
  DOCUMENT_REJECTED = 'document_rejected',

  // Admin operations
  ADMIN_APPROVAL = 'admin_approval',
  ADMIN_REJECTION = 'admin_rejection',
  ADMIN_REVIEW = 'admin_review',

  // Subscription operations
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',

  // Newsletter operations
  NEWSLETTER_CREATED = 'newsletter_created',
  NEWSLETTER_SENT = 'newsletter_sent',

  // Task operations
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',

  // Access control events
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_VIOLATION = 'permission_violation',

  // Data export events
  DATA_EXPORTED = 'data_exported',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Safely get header value to avoid "Cannot read private member" error
 */
function safeGetHeader(headers: any, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id?: string;
  user_email?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  result: 'success' | 'failure';
  ip_address?: string;
  user_agent?: string;
  request_path?: string;
  request_method?: string;
  details?: Record<string, any>;
  error_message?: string;
}

/**
 * Write audit log entry to database
 */
export async function logAuditEvent(
  entry: AuditLogEntry,
  context: InvocationContext
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (
        event_type,
        severity,
        user_id,
        user_email,
        resource_type,
        resource_id,
        action,
        result,
        ip_address,
        user_agent,
        request_path,
        request_method,
        details,
        error_message,
        dt_created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
      [
        entry.event_type,
        entry.severity,
        entry.user_id,
        entry.user_email,
        entry.resource_type,
        entry.resource_id,
        entry.action,
        entry.result,
        entry.ip_address,
        entry.user_agent,
        entry.request_path,
        entry.request_method,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.error_message,
      ]
    );

    context.log('Audit event logged:', entry.event_type, entry.result);
  } catch (error) {
    // Don't fail the request if audit logging fails
    context.error('Failed to write audit log:', error);
  }
}

/**
 * Helper function to extract IP address from request
 */
function getClientIp(request: AuthenticatedRequest): string | undefined {
  // Check common headers for client IP (safe header access)
  const forwardedFor = safeGetHeader(request.headers, 'x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = safeGetHeader(request.headers, 'x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Middleware to automatically log API access
 */
export function auditMiddleware(
  request: AuthenticatedRequest,
  context: InvocationContext,
  eventType: AuditEventType,
  resourceType?: string,
  resourceId?: string
) {
  const entry: AuditLogEntry = {
    event_type: eventType,
    severity: AuditSeverity.INFO,
    user_id: request.userId,
    user_email: request.userEmail,
    resource_type: resourceType,
    resource_id: resourceId,
    request_path: request.url,
    request_method: request.method,
    ip_address: getClientIp(request),
    user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
    result: 'success',
  };

  return {
    /**
     * Log successful operation
     */
    success: async (details?: Record<string, any>) => {
      await logAuditEvent(
        {
          ...entry,
          result: 'success',
          details,
        },
        context
      );
    },

    /**
     * Log failed operation
     */
    failure: async (error: Error | string, severity: AuditSeverity = AuditSeverity.ERROR) => {
      await logAuditEvent(
        {
          ...entry,
          result: 'failure',
          severity,
          error_message: typeof error === 'string' ? error : error.message,
        },
        context
      );
    },

    /**
     * Log with custom details
     */
    log: async (
      result: 'success' | 'failure',
      details?: Record<string, any>,
      severity?: AuditSeverity
    ) => {
      await logAuditEvent(
        {
          ...entry,
          result,
          details,
          severity: severity || entry.severity,
        },
        context
      );
    },
  };
}

/**
 * Convenience functions for common audit events
 */

export async function logAuthSuccess(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<void> {
  await logAuditEvent(
    {
      event_type: AuditEventType.AUTH_SUCCESS,
      severity: AuditSeverity.INFO,
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: getClientIp(request),
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      result: 'success',
    },
    context
  );
}

export async function logAuthFailure(
  request: AuthenticatedRequest,
  reason: string,
  context: InvocationContext
): Promise<void> {
  await logAuditEvent(
    {
      event_type: AuditEventType.AUTH_FAILURE,
      severity: AuditSeverity.WARNING,
      ip_address: getClientIp(request),
      user_agent: safeGetHeader(request.headers, 'user-agent') || undefined,
      error_message: reason,
      result: 'failure',
    },
    context
  );
}

export async function logAccessDenied(
  request: AuthenticatedRequest,
  resourceType: string,
  resourceId: string,
  reason: string,
  context: InvocationContext
): Promise<void> {
  await logAuditEvent(
    {
      event_type: AuditEventType.ACCESS_DENIED,
      severity: AuditSeverity.WARNING,
      user_id: request.userId,
      user_email: request.userEmail,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: getClientIp(request),
      error_message: reason,
      result: 'failure',
    },
    context
  );
}

export async function logPermissionViolation(
  request: AuthenticatedRequest,
  requiredPermission: string,
  context: InvocationContext
): Promise<void> {
  await logAuditEvent(
    {
      event_type: AuditEventType.PERMISSION_VIOLATION,
      severity: AuditSeverity.WARNING,
      user_id: request.userId,
      user_email: request.userEmail,
      ip_address: getClientIp(request),
      details: { required_permission: requiredPermission },
      result: 'failure',
    },
    context
  );
}
