/**
 * M2M Client Utilities
 *
 * Helper functions for M2M client operations.
 * Includes audit logging, header extraction, and secret generation.
 */

import { InvocationContext } from '@azure/functions';
import { AuthenticatedRequest } from '../middleware/endpointWrapper';
import { logAuditEvent, AuditEventType, AuditSeverity } from '../middleware/auditLog';
import * as crypto from 'crypto';

/**
 * Safely extracts header value to avoid "Cannot read private member" error
 *
 * @param headers - Request headers object
 * @param name - Header name
 * @returns Header value or null if not found
 */
export function safeGetHeader(headers: any, name: string): string | null {
  try {
    return headers.get(name);
  } catch (error) {
    return null;
  }
}

/**
 * Extracts client IP address from request headers
 * Prioritizes x-forwarded-for (proxy/CDN), falls back to x-real-ip
 *
 * @param headers - Request headers
 * @returns Client IP address or undefined
 */
export function extractClientIp(headers: any): string | undefined {
  const forwardedFor = safeGetHeader(headers, 'x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated list, take first IP
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = safeGetHeader(headers, 'x-real-ip');
  return realIp || undefined;
}

/**
 * Extracts user agent from request headers
 *
 * @param headers - Request headers
 * @returns User agent string or undefined
 */
export function extractUserAgent(headers: any): string | undefined {
  return safeGetHeader(headers, 'user-agent') || undefined;
}

/**
 * Common audit log parameters extracted from request
 */
export interface AuditLogParams {
  user_id: string;
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  request_path: string;
  request_method: string;
}

/**
 * Extracts common audit log parameters from request
 *
 * @param request - Authenticated HTTP request
 * @returns Audit log parameters
 */
export function extractAuditParams(request: AuthenticatedRequest): AuditLogParams {
  return {
    user_id: request.userId,
    user_email: request.userEmail,
    ip_address: extractClientIp(request.headers),
    user_agent: extractUserAgent(request.headers),
    request_path: request.url,
    request_method: request.method
  };
}

/**
 * Logs successful access to M2M clients
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param resourceId - Resource ID (legal entity or client ID)
 * @param details - Additional details to log
 */
export async function logAccessGranted(
  request: AuthenticatedRequest,
  context: InvocationContext,
  resourceId: string,
  details: Record<string, unknown>
): Promise<void> {
  const auditParams = extractAuditParams(request);

  await logAuditEvent({
    event_type: AuditEventType.ACCESS_GRANTED,
    severity: AuditSeverity.INFO,
    result: 'success',
    ...auditParams,
    resource_type: 'm2m_client',
    resource_id: resourceId,
    action: 'read',
    details
  }, context);
}

/**
 * Logs access denial (IDOR attempt or ownership failure)
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param resourceId - Resource ID (legal entity or client ID)
 * @param action - Action attempted
 * @param reason - Denial reason
 */
export async function logAccessDenied(
  request: AuthenticatedRequest,
  context: InvocationContext,
  resourceId: string,
  action: string,
  reason: string
): Promise<void> {
  const auditParams = extractAuditParams(request);

  await logAuditEvent({
    event_type: AuditEventType.ACCESS_DENIED,
    severity: AuditSeverity.WARNING,
    result: 'failure',
    ...auditParams,
    resource_type: 'm2m_client',
    resource_id: resourceId,
    action,
    details: { reason },
    error_message: `User does not have permission to ${action} M2M client(s)`
  }, context);

  context.warn(`IDOR attempt: User ${request.userEmail} tried to ${action} resource ${resourceId}`);
}

/**
 * Logs M2M client creation
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param clientId - Created client ID
 * @param details - Client creation details
 */
export async function logClientCreated(
  request: AuthenticatedRequest,
  context: InvocationContext,
  clientId: string,
  details: Record<string, unknown>
): Promise<void> {
  const auditParams = extractAuditParams(request);

  await logAuditEvent({
    event_type: AuditEventType.MEMBER_CREATED,
    severity: AuditSeverity.INFO,
    result: 'success',
    ...auditParams,
    resource_type: 'm2m_client',
    resource_id: clientId,
    action: 'create',
    details
  }, context);

  context.info(`M2M client created: ${clientId} for entity ${details.legal_entity_id}`);
}

/**
 * Logs secret generation (elevated severity)
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param clientId - Client ID
 * @param details - Secret generation details
 */
export async function logSecretGenerated(
  request: AuthenticatedRequest,
  context: InvocationContext,
  clientId: string,
  details: Record<string, unknown>
): Promise<void> {
  const auditParams = extractAuditParams(request);

  await logAuditEvent({
    event_type: AuditEventType.TOKEN_ISSUED,
    severity: AuditSeverity.WARNING, // Elevated severity for secret generation
    result: 'success',
    ...auditParams,
    resource_type: 'm2m_client_secret',
    resource_id: clientId,
    action: 'generate_secret',
    details
  }, context);

  context.warn(`SECRET GENERATED: M2M client ${clientId} for entity ${details.legal_entity_id}`);
}

/**
 * Logs scope update
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param clientId - Client ID
 * @param details - Update details (old_scopes, new_scopes)
 */
export async function logScopesUpdated(
  request: AuthenticatedRequest,
  context: InvocationContext,
  clientId: string,
  details: Record<string, unknown>
): Promise<void> {
  const auditParams = extractAuditParams(request);

  await logAuditEvent({
    event_type: AuditEventType.MEMBER_UPDATED,
    severity: AuditSeverity.INFO,
    result: 'success',
    ...auditParams,
    resource_type: 'm2m_client',
    resource_id: clientId,
    action: 'update_scopes',
    details
  }, context);

  context.info(`Scopes updated for M2M client ${clientId}`);
}

/**
 * Logs client deactivation
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param clientId - Client ID
 * @param details - Deactivation details
 */
export async function logClientDeactivated(
  request: AuthenticatedRequest,
  context: InvocationContext,
  clientId: string,
  details: Record<string, unknown>
): Promise<void> {
  const auditParams = extractAuditParams(request);

  await logAuditEvent({
    event_type: AuditEventType.MEMBER_SUSPENDED,
    severity: AuditSeverity.WARNING,
    result: 'success',
    ...auditParams,
    resource_type: 'm2m_client',
    resource_id: clientId,
    action: 'deactivate',
    details
  }, context);

  context.warn(`M2M client deactivated: ${clientId} - Reason: ${details.reason}`);
}

/**
 * Logs operation error
 *
 * @param request - Authenticated HTTP request
 * @param context - Invocation context
 * @param resourceId - Resource ID
 * @param action - Action that failed
 * @param eventType - Audit event type
 * @param severity - Error severity
 * @param error - Error object
 */
export async function logOperationError(
  request: AuthenticatedRequest,
  context: InvocationContext,
  resourceId: string,
  action: string,
  eventType: AuditEventType,
  severity: AuditSeverity,
  error: unknown
): Promise<void> {
  const auditParams = extractAuditParams(request);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  await logAuditEvent({
    event_type: eventType,
    severity,
    result: 'failure',
    ...auditParams,
    resource_type: 'm2m_client',
    resource_id: resourceId,
    action,
    error_message: errorMessage,
    details: { error: errorMessage }
  }, context);

  context.error(`Error during ${action}:`, error);
}

/**
 * Generates cryptographically secure client secret
 *
 * @returns URL-safe base64-encoded secret (256-bit)
 */
export function generateClientSecret(): string {
  const secretBytes = crypto.randomBytes(32); // 256 bits
  return secretBytes.toString('base64url'); // URL-safe base64 encoding
}

/**
 * Generates Azure AD client ID (UUID v4)
 *
 * @returns UUID v4 string
 */
export function generateAzureClientId(): string {
  return crypto.randomUUID();
}

/**
 * Calculates secret expiration date
 *
 * @param expiresInDays - Number of days until expiration
 * @returns Expiration date
 */
export function calculateExpirationDate(expiresInDays: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  return expiresAt;
}
