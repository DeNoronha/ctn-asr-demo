/**
 * Endpoints Controller
 *
 * Handles endpoint CRUD operations for legal entities.
 * Endpoints represent M2M communication endpoints (REST APIs, webhooks, etc.)
 *
 * Security features:
 * - SSRF protection (SEC-005): URL validation before fetching
 * - IDOR protection (SEC-006): Authorization checks before operations
 *
 * @module controllers/endpoints
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getPool } from '../utils/database';
import { invalidateCacheForUser } from '../middleware/cache';

// ============================================================================
// SSRF PROTECTION HELPER
// ============================================================================

/**
 * SSRF protection: Validate URL is safe to fetch (SEC-005)
 * Blocks localhost, private IPs, cloud metadata endpoints
 */
export function isUrlSafeForFetch(urlString: string): { safe: boolean; reason?: string } {
  try {
    const url = new URL(urlString);

    // Only allow HTTP/HTTPS protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost and loopback addresses
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { safe: false, reason: 'Localhost addresses are not allowed' };
    }

    // Block cloud metadata endpoints (AWS, Azure, GCP)
    const metadataEndpoints = [
      '169.254.169.254',  // AWS/Azure/GCP metadata
      'metadata.google.internal',
      'metadata.goog',
      '169.254.170.2',    // AWS ECS task metadata
    ];
    if (metadataEndpoints.includes(hostname)) {
      return { safe: false, reason: 'Cloud metadata endpoints are not allowed' };
    }

    // Block private IP ranges (RFC 1918)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c] = ipv4Match.map(Number);

      // 10.0.0.0/8 - Private network
      if (a === 10) {
        return { safe: false, reason: 'Private IP ranges (10.x.x.x) are not allowed' };
      }

      // 172.16.0.0/12 - Private network
      if (a === 172 && b >= 16 && b <= 31) {
        return { safe: false, reason: 'Private IP ranges (172.16-31.x.x) are not allowed' };
      }

      // 192.168.0.0/16 - Private network
      if (a === 192 && b === 168) {
        return { safe: false, reason: 'Private IP ranges (192.168.x.x) are not allowed' };
      }

      // 169.254.0.0/16 - Link-local
      if (a === 169 && b === 254) {
        return { safe: false, reason: 'Link-local addresses (169.254.x.x) are not allowed' };
      }

      // 0.0.0.0/8 - Current network
      if (a === 0) {
        return { safe: false, reason: 'Invalid IP address' };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

// ============================================================================
// ENDPOINTS BY LEGAL ENTITY
// ============================================================================

/**
 * GET /v1/legal-entities/:legalentityid/endpoints
 * Get all endpoints for a legal entity
 */
export async function getEndpointsByLegalEntity(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        is_active,
        activation_date,
        deactivation_date,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1 AND is_deleted = false
      ORDER BY endpoint_name ASC
    `, [legalentityid]);

    res.json({ data: rows });
  } catch (error: any) {
    console.error('Error fetching endpoints:', {
      legalEntityId: req.params.legalentityid,
      error: error.message,
      stack: error.stack,
      detail: error.detail || error.toString()
    });
    res.status(500).json({ error: 'Failed to fetch endpoints', detail: error.message });
  }
}

/**
 * POST /v1/legal-entities/:legalentityid/endpoints
 * Create a new endpoint for a legal entity
 */
export async function createEndpointForLegalEntity(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const endpointId = randomUUID();

    const { endpoint_type, endpoint_url, endpoint_name, is_active, authentication_method } = req.body;

    if (!endpoint_url || !endpoint_name) {
      res.status(400).json({ error: 'endpoint_url and endpoint_name are required' });
      return;
    }

    const { rows } = await pool.query(`
      INSERT INTO legal_entity_endpoint (
        legal_entity_endpoint_id, legal_entity_id, endpoint_type, endpoint_url,
        endpoint_name, is_active, authentication_method,
        dt_created, dt_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [endpointId, legalentityid, endpoint_type || 'REST_API', endpoint_url, endpoint_name, is_active !== false, authentication_method]);

    // Invalidate endpoints cache
    invalidateCacheForUser(req, `/v1/legal-entities/${legalentityid}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Error creating endpoint:', error);
    res.status(500).json({ error: 'Failed to create endpoint' });
  }
}

// ============================================================================
// STANDALONE ENDPOINT OPERATIONS
// ============================================================================

/**
 * PUT /v1/endpoints/:endpointId
 * Update an endpoint
 */
export async function updateEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { endpointId } = req.params;

    const { endpoint_type, endpoint_url, endpoint_name, is_active, authentication_method } = req.body;

    const { rows } = await pool.query(`
      UPDATE legal_entity_endpoint SET
        endpoint_type = COALESCE($1, endpoint_type),
        endpoint_url = COALESCE($2, endpoint_url),
        endpoint_name = COALESCE($3, endpoint_name),
        is_active = COALESCE($4, is_active),
        authentication_method = COALESCE($5, authentication_method),
        dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $6 AND is_deleted = false
      RETURNING *
    `, [endpoint_type, endpoint_url, endpoint_name, is_active, authentication_method, endpointId]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }

    // Invalidate endpoints cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating endpoint:', error);
    res.status(500).json({ error: 'Failed to update endpoint' });
  }
}

/**
 * DELETE /v1/endpoints/:endpointId
 * Soft-delete an endpoint
 */
export async function deleteEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { endpointId } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_endpoint SET is_deleted = true, dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [endpointId]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }

    // Invalidate endpoints cache for this legal entity
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting endpoint:', error);
    res.status(500).json({ error: 'Failed to delete endpoint' });
  }
}

/**
 * POST /v1/endpoints/:endpointId/test
 * Test endpoint connection
 * Includes SSRF protection (SEC-005) and IDOR protection (SEC-006)
 */
export async function testEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { endpointId } = req.params;

    // Get the endpoint
    const { rows, rowCount } = await pool.query(`
      SELECT legal_entity_endpoint_id, endpoint_url, endpoint_name, authentication_method, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `, [endpointId]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }

    const endpoint = rows[0];

    // IDOR protection: Verify user has access to this endpoint's legal entity (SEC-006)
    const userEmail = (req as any).userEmail;
    const userRoles = (req as any).userRoles || [];

    // SystemAdmin and AssociationAdmin can test any endpoint
    const isAdmin = userRoles.includes('SystemAdmin') || userRoles.includes('AssociationAdmin');

    if (!isAdmin) {
      // Check if user's party owns this endpoint
      const { rows: partyRows } = await pool.query(`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `, [endpoint.legal_entity_id, userEmail]);

      if (partyRows.length === 0) {
        // Return 404 to prevent information disclosure (don't reveal endpoint exists)
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }
    }

    const testStartTime = Date.now();
    let success = false;
    let statusCode: number | undefined;
    let errorMessage: string | undefined;

    // Attempt to test connection if URL exists
    if (endpoint.endpoint_url) {
      // SSRF protection: Validate URL before fetching (SEC-005)
      const urlValidation = isUrlSafeForFetch(endpoint.endpoint_url);
      if (!urlValidation.safe) {
        errorMessage = `URL blocked: ${urlValidation.reason}`;
      } else {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

          const response = await fetch(endpoint.endpoint_url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'manual', // Don't follow redirects automatically (SSRF protection)
          });
          clearTimeout(timeout);

          statusCode = response.status;
          // Consider redirect as partial success - URL is reachable but redirects
          if (response.status >= 300 && response.status < 400) {
            success = true;
            errorMessage = `Endpoint redirects to: ${response.headers.get('location') || 'unknown'}`;
          } else {
            success = response.ok;
          }
        } catch (fetchError: any) {
          errorMessage = fetchError.name === 'AbortError'
            ? 'Connection timeout (10s)'
            : fetchError.message || 'Connection failed';
        }
      }
    } else {
      errorMessage = 'No endpoint URL configured';
    }

    const responseTime = Date.now() - testStartTime;

    // Update the endpoint with test results
    await pool.query(`
      UPDATE legal_entity_endpoint
      SET last_connection_test = NOW(),
          last_connection_status = $2,
          connection_test_details = $3,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1
    `, [
      endpointId,
      success ? 'SUCCESS' : 'FAILED',
      JSON.stringify({
        status_code: statusCode,
        response_time_ms: responseTime,
        error_message: errorMessage,
        tested_at: new Date().toISOString(),
      }),
    ]);

    res.json({
      success,
      message: success ? 'Connection successful' : (errorMessage || 'Connection failed'),
      details: {
        status_code: statusCode,
        response_time_ms: responseTime,
        error_message: errorMessage,
        tested_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error testing endpoint:', error);
    res.status(500).json({ error: 'Failed to test endpoint connection' });
  }
}

/**
 * PATCH /v1/endpoints/:endpointId/toggle
 * Toggle endpoint active status
 * Includes IDOR protection (SEC-006)
 */
export async function toggleEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { endpointId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      res.status(400).json({ error: 'is_active must be a boolean' });
      return;
    }

    // First, get the endpoint to check authorization (SEC-006)
    const { rows: endpointRows, rowCount: endpointCount } = await pool.query(`
      SELECT legal_entity_endpoint_id, legal_entity_id
      FROM legal_entity_endpoint
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
    `, [endpointId]);

    if (endpointCount === 0) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }

    const endpoint = endpointRows[0];

    // IDOR protection: Verify user has access to this endpoint's legal entity (SEC-006)
    const userEmail = (req as any).userEmail;
    const userRoles = (req as any).userRoles || [];

    // SystemAdmin and AssociationAdmin can toggle any endpoint
    const isAdmin = userRoles.includes('SystemAdmin') || userRoles.includes('AssociationAdmin');

    if (!isAdmin) {
      // Check if user's party owns this endpoint
      const { rows: partyRows } = await pool.query(`
        SELECT 1 FROM legal_entity le
        JOIN legal_entity_contact lec ON lec.legal_entity_id = le.legal_entity_id
        WHERE le.legal_entity_id = $1
          AND lec.email = $2
          AND lec.is_active = true
          AND le.is_deleted = false
      `, [endpoint.legal_entity_id, userEmail]);

      if (partyRows.length === 0) {
        // Return 404 to prevent information disclosure (don't reveal endpoint exists)
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }
    }

    // Now perform the update
    const { rows, rowCount } = await pool.query(`
      UPDATE legal_entity_endpoint
      SET is_active = $2,
          activation_date = CASE WHEN $2 = true THEN NOW() ELSE activation_date END,
          deactivation_date = CASE WHEN $2 = false THEN NOW() ELSE NULL END,
          dt_modified = NOW()
      WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      RETURNING *
    `, [endpointId, is_active]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }

    // Invalidate cache
    invalidateCacheForUser(req, `/v1/legal-entities/${rows[0].legal_entity_id}/endpoints`);
    invalidateCacheForUser(req, `/v1/member-endpoints`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error toggling endpoint:', error);
    res.status(500).json({ error: 'Failed to toggle endpoint status' });
  }
}

// ============================================================================
// MEMBER ENDPOINTS (Self-service)
// ============================================================================

/**
 * GET /v1/member-endpoints
 * Get endpoints for the current user's legal entity
 */
export async function getMemberEndpoints(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const userEmail = (req as any).userEmail;

    if (!userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get member's legal_entity_id using email
    let memberResult = await pool.query(`
      SELECT DISTINCT le.legal_entity_id
      FROM legal_entity le
      INNER JOIN legal_entity_contact c ON le.legal_entity_id = c.legal_entity_id
      WHERE c.email = $1 AND c.is_active = true
      LIMIT 1
    `, [userEmail]);

    // If not found, try by domain (members table dropped Dec 12, 2025)
    if (memberResult.rows.length === 0) {
      const emailDomain = userEmail.split('@')[1];
      memberResult = await pool.query(`
        SELECT legal_entity_id
        FROM vw_legal_entities
        WHERE domain = $1
        LIMIT 1
      `, [emailDomain]);
    }

    if (memberResult.rows.length === 0) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const { legal_entity_id } = memberResult.rows[0];

    // Get all endpoints for this member's legal entity
    const result = await pool.query(`
      SELECT
        legal_entity_endpoint_id,
        legal_entity_id,
        endpoint_name,
        endpoint_url,
        endpoint_description,
        data_category,
        endpoint_type,
        authentication_method,
        last_connection_test,
        last_connection_status,
        is_active,
        activation_date,
        deactivation_date,
        verification_status,
        verification_sent_at,
        verification_expires_at,
        dt_created,
        dt_modified
      FROM legal_entity_endpoint
      WHERE legal_entity_id = $1
        AND is_deleted = false
      ORDER BY dt_created DESC
    `, [legal_entity_id]);

    res.json({ endpoints: result.rows });
  } catch (error: any) {
    console.error('Error fetching member endpoints:', error);
    res.status(500).json({ error: 'Failed to fetch member endpoints' });
  }
}
