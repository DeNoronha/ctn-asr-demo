/**
 * M2M Client Repository
 *
 * Data access layer for M2M client operations.
 * All database queries are parameterized to prevent SQL injection.
 * Adheres to Repository Pattern - isolates data access logic.
 */

import { Pool, QueryResult } from 'pg';
import { PaginationParams } from '../utils/pagination';

/**
 * M2M Client database record interface
 */
export interface M2MClient {
  m2m_client_id: string;
  legal_entity_id: string;
  client_name: string;
  azure_client_id: string;
  azure_object_id: string | null;
  description: string | null;
  assigned_scopes: string[];
  is_active: boolean;
  dt_created: Date;
  dt_modified: Date;
  created_by?: string;
  modified_by?: string;
  active_secrets_count?: number;
  last_secret_generated_at?: Date | null;
}

/**
 * Ownership verification result
 */
export interface OwnershipResult {
  legal_entity_id: string;
  client_name?: string;
  old_scopes?: string[];
}

/**
 * Query to fetch M2M clients for a legal entity (used in both admin and user context)
 */
const SELECT_CLIENTS_BASE_QUERY = `
  SELECT
    c.m2m_client_id,
    c.legal_entity_id,
    c.client_name,
    c.azure_client_id,
    c.azure_object_id,
    c.description,
    c.assigned_scopes,
    c.is_active,
    c.dt_created,
    c.dt_modified,
    c.created_by,
    c.modified_by,
    (SELECT COUNT(*)
     FROM m2m_client_secrets_audit s
     WHERE s.m2m_client_id = c.m2m_client_id
       AND s.is_revoked = false) as active_secrets_count,
    (SELECT MAX(secret_generated_at)
     FROM m2m_client_secrets_audit s
     WHERE s.m2m_client_id = c.m2m_client_id) as last_secret_generated_at
  FROM m2m_clients c
  WHERE c.legal_entity_id = $1
    AND c.is_deleted = false
  ORDER BY c.dt_created DESC
`;

/**
 * Fetches M2M clients for a legal entity
 *
 * @param pool - Database connection pool
 * @param legalEntityId - Legal entity UUID
 * @returns Query result with M2M clients
 */
export async function fetchClientsByLegalEntity(
  pool: Pool,
  legalEntityId: string
): Promise<QueryResult<M2MClient>> {
  return await pool.query(SELECT_CLIENTS_BASE_QUERY, [legalEntityId]);
}

/**
 * Verifies user ownership of a legal entity (for non-admin users)
 *
 * @param pool - Database connection pool
 * @param legalEntityId - Legal entity UUID
 * @param userEmail - User's email address
 * @returns Query result (empty if no ownership)
 */
export async function verifyLegalEntityOwnership(
  pool: Pool,
  legalEntityId: string,
  userEmail: string
): Promise<QueryResult<OwnershipResult>> {
  const query = `
    SELECT le.legal_entity_id
    FROM legal_entity le
    JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
    WHERE le.legal_entity_id = $1
      AND c.email = $2
      AND c.is_active = true
      AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)
  `;

  return await pool.query(query, [legalEntityId, userEmail]);
}

/**
 * Inserts a new M2M client
 *
 * @param pool - Database connection pool
 * @param data - Client creation data
 * @returns Query result with created client
 */
export async function insertM2MClient(
  pool: Pool,
  data: {
    legal_entity_id: string;
    client_name: string;
    azure_client_id: string;
    description: string | null;
    assigned_scopes: string[];
    created_by: string;
  }
): Promise<QueryResult<M2MClient>> {
  const query = `
    INSERT INTO m2m_clients (
      legal_entity_id,
      client_name,
      azure_client_id,
      description,
      assigned_scopes,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      m2m_client_id,
      legal_entity_id,
      client_name,
      azure_client_id,
      azure_object_id,
      description,
      assigned_scopes,
      is_active,
      dt_created,
      dt_modified
  `;

  return await pool.query(query, [
    data.legal_entity_id,
    data.client_name,
    data.azure_client_id,
    data.description,
    data.assigned_scopes,
    data.created_by
  ]);
}

/**
 * Verifies M2M client ownership via legal entity
 * Checks both direct ownership and admin roles
 *
 * @param pool - Database connection pool
 * @param clientId - M2M client UUID
 * @param userEmail - User's email address
 * @param userRole - User's primary role (for admin check)
 * @param includeOldScopes - Whether to include old_scopes in result (for update operations)
 * @returns Query result (empty if no ownership)
 */
export async function verifyM2MClientOwnership(
  pool: Pool,
  clientId: string,
  userEmail: string,
  userRole: string,
  includeOldScopes: boolean = false
): Promise<QueryResult<OwnershipResult>> {
  const selectFields = includeOldScopes
    ? 'c.m2m_client_id, c.legal_entity_id, c.client_name, c.assigned_scopes as old_scopes'
    : 'c.m2m_client_id, c.legal_entity_id, c.client_name';

  const query = `
    SELECT ${selectFields}
    FROM m2m_clients c
    JOIN legal_entity le ON c.legal_entity_id = le.legal_entity_id
    LEFT JOIN legal_entity_contact lec ON le.legal_entity_id = lec.legal_entity_id
      AND lec.email = $2
      AND lec.is_active = true
    WHERE c.m2m_client_id = $1
      AND c.is_deleted = false
      AND c.is_active = true
      AND (lec.legal_entity_contact_id IS NOT NULL OR $3 = ANY(ARRAY['SYSTEM_ADMIN', 'ASSOCIATION_ADMIN']))
  `;

  return await pool.query(query, [clientId, userEmail, userRole]);
}

/**
 * Verifies create permission for a legal entity
 * Checks both direct ownership and admin roles
 *
 * @param pool - Database connection pool
 * @param legalEntityId - Legal entity UUID
 * @param userEmail - User's email address
 * @param userRole - User's primary role (for admin check)
 * @returns Query result (empty if no permission)
 */
export async function verifyCreatePermission(
  pool: Pool,
  legalEntityId: string,
  userEmail: string,
  userRole: string
): Promise<QueryResult<OwnershipResult>> {
  const query = `
    SELECT le.legal_entity_id
    FROM legal_entity le
    LEFT JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      AND c.email = $2
      AND c.is_active = true
    WHERE le.legal_entity_id = $1
      AND (le.is_deleted IS NULL OR le.is_deleted = FALSE)
      AND (c.legal_entity_contact_id IS NOT NULL OR $3 = ANY(ARRAY['SYSTEM_ADMIN', 'ASSOCIATION_ADMIN']))
  `;

  return await pool.query(query, [legalEntityId, userEmail, userRole]);
}

/**
 * Inserts audit record for secret generation
 * NEVER stores the actual secret
 *
 * @param pool - Database connection pool
 * @param data - Secret audit data
 */
export async function insertSecretAuditRecord(
  pool: Pool,
  data: {
    m2m_client_id: string;
    generated_by: string;
    expires_at: Date;
    generated_from_ip: string | null;
    user_agent: string | null;
  }
): Promise<void> {
  const query = `
    INSERT INTO m2m_client_secrets_audit (
      m2m_client_id,
      generated_by,
      expires_at,
      generated_from_ip,
      user_agent
    ) VALUES ($1, $2, $3, $4, $5)
  `;

  await pool.query(query, [
    data.m2m_client_id,
    data.generated_by,
    data.expires_at,
    data.generated_from_ip,
    data.user_agent
  ]);
}

/**
 * Updates M2M client scopes
 *
 * @param pool - Database connection pool
 * @param clientId - M2M client UUID
 * @param assignedScopes - New scopes array
 * @param modifiedBy - User ID performing the update
 * @returns Query result with updated client
 */
export async function updateClientScopes(
  pool: Pool,
  clientId: string,
  assignedScopes: string[],
  modifiedBy: string
): Promise<QueryResult<M2MClient>> {
  const query = `
    UPDATE m2m_clients
    SET assigned_scopes = $1,
        dt_modified = NOW(),
        modified_by = $2
    WHERE m2m_client_id = $3
    RETURNING
      m2m_client_id,
      legal_entity_id,
      client_name,
      azure_client_id,
      azure_object_id,
      description,
      assigned_scopes,
      is_active,
      dt_created,
      dt_modified
  `;

  return await pool.query(query, [assignedScopes, modifiedBy, clientId]);
}

/**
 * Deactivates M2M client (soft delete)
 *
 * @param pool - Database connection pool
 * @param clientId - M2M client UUID
 * @param reason - Deactivation reason
 * @param modifiedBy - User ID performing the deactivation
 */
export async function deactivateClient(
  pool: Pool,
  clientId: string,
  reason: string,
  modifiedBy: string
): Promise<void> {
  const query = `
    UPDATE m2m_clients
    SET is_active = false,
        deactivation_date = NOW(),
        deactivation_reason = $1,
        dt_modified = NOW(),
        modified_by = $2
    WHERE m2m_client_id = $3
  `;

  await pool.query(query, [reason, modifiedBy, clientId]);
}

/**
 * Revokes all active secrets for an M2M client
 *
 * @param pool - Database connection pool
 * @param clientId - M2M client UUID
 * @param revokedBy - User ID performing the revocation
 * @param reason - Revocation reason
 */
export async function revokeAllClientSecrets(
  pool: Pool,
  clientId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  const query = `
    UPDATE m2m_client_secrets_audit
    SET is_revoked = true,
        revoked_at = NOW(),
        revoked_by = $1,
        revocation_reason = $2
    WHERE m2m_client_id = $3
      AND is_revoked = false
  `;

  await pool.query(query, [revokedBy, reason, clientId]);
}
