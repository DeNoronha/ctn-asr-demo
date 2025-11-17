// ========================================
// PII Pseudonymization Utility
// ========================================
// GDPR Article 5(1)(c) - Data Minimization
// GDPR Article 25 - Data Protection by Design
// GDPR Article 32 - Security of Processing
//
// Provides HMAC-based pseudonymization for audit log PII
// (email addresses, IP addresses)

import crypto from 'crypto';
import { InvocationContext } from '@azure/functions';
import { getPool } from './database';

/**
 * Secret from Azure Key Vault
 * CRITICAL: This MUST be configured as an environment variable
 * DO NOT hardcode secrets in source code
 */
const PSEUDONYMIZATION_SECRET = process.env.AUDIT_LOG_SECRET;
const PII_ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY;

/**
 * Validate environment variables at module load time
 * Fail fast with clear error messages
 */
if (!PSEUDONYMIZATION_SECRET) {
  console.error('CRITICAL: AUDIT_LOG_SECRET environment variable not configured');
  console.error('PII pseudonymization is DISABLED - audit logs will contain plaintext PII');
  console.warn('This is a GDPR compliance violation - configure AUDIT_LOG_SECRET immediately');
}

if (!PII_ENCRYPTION_KEY) {
  console.error('WARNING: PII_ENCRYPTION_KEY environment variable not configured');
  console.error('De-pseudonymization will not be available');
}

/**
 * Pseudonymize email address using HMAC-SHA256
 *
 * Properties:
 * - Deterministic: Same email always produces same pseudonym
 * - One-way: Cannot reverse pseudonym to email without secret
 * - Fixed length: Always 24 characters (email_ prefix + 16 hex chars)
 * - Collision resistant: SHA256 cryptographic strength
 *
 * Example:
 *   "john.doe@example.com" → "email_a1b2c3d4e5f6g7h8"
 *
 * @param email - Email address to pseudonymize
 * @returns Pseudonymized email or null if input is null/undefined
 */
export function pseudonymizeEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }

  // If pseudonymization is disabled (no secret), return null to prevent plaintext storage
  if (!PSEUDONYMIZATION_SECRET) {
    return null;
  }

  try {
    // Normalize email to lowercase for consistency
    const normalizedEmail = email.toLowerCase().trim();

    // Create HMAC with secret
    const hmac = crypto.createHmac('sha256', PSEUDONYMIZATION_SECRET);
    hmac.update(normalizedEmail);
    const hash = hmac.digest('hex');

    // Return pseudonym with prefix
    return `email_${hash.substring(0, 16)}`;
  } catch (error) {
    console.error('Error pseudonymizing email:', error);
    return null;
  }
}

/**
 * Pseudonymize IP address using HMAC-SHA256
 *
 * Properties:
 * - Deterministic: Same IP always produces same pseudonym
 * - One-way: Cannot reverse pseudonym to IP without secret
 * - Preserves IP version: ipv4_ or ipv6_ prefix for analysis
 * - Fixed length: 17 characters (ipv4_/ipv6_ prefix + 12 hex chars)
 *
 * Example:
 *   "192.168.1.1" → "ipv4_a1b2c3d4e5f6"
 *   "2001:0db8::1" → "ipv6_a1b2c3d4e5f6"
 *
 * @param ip - IP address to pseudonymize (IPv4 or IPv6)
 * @returns Pseudonymized IP address or null if input is null/undefined
 */
export function pseudonymizeIP(ip: string | null | undefined): string | null {
  if (!ip) {
    return null;
  }

  // If pseudonymization is disabled (no secret), return null to prevent plaintext storage
  if (!PSEUDONYMIZATION_SECRET) {
    return null;
  }

  try {
    // Detect IP version (IPv6 contains colons)
    const isIPv6 = ip.includes(':');

    // Create HMAC with secret
    const hmac = crypto.createHmac('sha256', PSEUDONYMIZATION_SECRET);
    hmac.update(ip.trim());
    const hash = hmac.digest('hex');

    // Return pseudonym with version-specific prefix
    const prefix = isIPv6 ? 'ipv6_' : 'ipv4_';
    return `${prefix}${hash.substring(0, 12)}`;
  } catch (error) {
    console.error('Error pseudonymizing IP address:', error);
    return null;
  }
}

/**
 * Store PII mapping for emergency de-pseudonymization
 *
 * This function stores the mapping between pseudonym and original value
 * in a separate, highly secured table with encryption at rest.
 *
 * Access Control:
 * - Only SystemAdmin role with MFA can access this table
 * - All access is logged in audit_log with severity=WARNING
 *
 * Encryption:
 * - Uses PostgreSQL pgcrypto extension (pgp_sym_encrypt)
 * - Encrypted with PII_ENCRYPTION_KEY (separate from pseudonymization secret)
 *
 * GDPR Compliance:
 * - Article 32: Encryption of personal data
 * - Article 5(1)(e): Storage limitation (90-day retention)
 *
 * @param pseudonym - Pseudonymized value (email_xxx or ipv4_xxx)
 * @param originalValue - Original PII value (email or IP address)
 * @param userId - User ID of the person performing the action (for audit trail)
 * @param context - Azure Functions invocation context
 */
export async function storePseudonymMapping(
  pseudonym: string,
  originalValue: string,
  userId: string | undefined,
  context: InvocationContext
): Promise<void> {
  if (!PII_ENCRYPTION_KEY) {
    context.warn('PII_ENCRYPTION_KEY not configured - skipping mapping storage');
    return;
  }

  const pool = getPool();

  try {
    await pool.query(
      `INSERT INTO audit_log_pii_mapping (pseudonym, encrypted_value, created_by, dt_created)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, NOW())
       ON CONFLICT (pseudonym) DO NOTHING`,
      [pseudonym, originalValue, PII_ENCRYPTION_KEY, userId || 'system']
    );

    context.log(`Stored PII mapping for pseudonym: ${pseudonym}`);
  } catch (error) {
    // Don't fail the request if mapping storage fails
    // Audit log is more important than the mapping
    context.error('Failed to store PII mapping:', error);
  }
}

/**
 * Retrieve original PII value from pseudonym
 *
 * RESTRICTED ACCESS:
 * - Caller MUST verify SystemAdmin role before calling
 * - Caller MUST log this access in audit_log with severity=WARNING
 * - Should only be used for emergency debugging/support cases
 *
 * @param pseudonym - Pseudonymized value (email_xxx or ipv4_xxx)
 * @param context - Azure Functions invocation context
 * @returns Original PII value or null if not found
 */
export async function retrieveOriginalValue(
  pseudonym: string,
  context: InvocationContext
): Promise<string | null> {
  if (!PII_ENCRYPTION_KEY) {
    context.warn('PII_ENCRYPTION_KEY not configured - cannot retrieve original value');
    return null;
  }

  const pool = getPool();

  try {
    const { rows } = await pool.query(
      `SELECT pgp_sym_decrypt(encrypted_value, $1) AS original_value
       FROM audit_log_pii_mapping
       WHERE pseudonym = $2`,
      [PII_ENCRYPTION_KEY, pseudonym]
    );

    if (rows.length === 0) {
      context.warn(`No PII mapping found for pseudonym: ${pseudonym}`);
      return null;
    }

    return rows[0].original_value;
  } catch (error) {
    context.error('Failed to retrieve original value:', error);
    return null;
  }
}

/**
 * Check if pseudonymization is enabled
 *
 * @returns true if AUDIT_LOG_SECRET is configured, false otherwise
 */
export function isPseudonymizationEnabled(): boolean {
  return !!PSEUDONYMIZATION_SECRET;
}

/**
 * Get pseudonymization status for health checks
 *
 * @returns Object with configuration status
 */
export function getPseudonymizationStatus() {
  return {
    pseudonymization_enabled: !!PSEUDONYMIZATION_SECRET,
    pii_encryption_enabled: !!PII_ENCRYPTION_KEY,
    compliance_status: !!PSEUDONYMIZATION_SECRET ? 'GDPR_COMPLIANT' : 'NON_COMPLIANT'
  };
}
