/**
 * M2M Controller
 *
 * Handles Machine-to-Machine (M2M) client operations.
 * M2M clients enable automated system-to-system authentication.
 *
 * @module controllers/m2m
 */

import { Request, Response } from 'express';
import { randomBytes, randomUUID, createHash } from 'crypto';
import { getPool } from '../utils/database';
import { invalidateCacheForUser } from '../middleware/cache';

// ============================================================================
// M2M CLIENT OPERATIONS
// ============================================================================

/**
 * GET /v1/legal-entities/:legal_entity_id/m2m-clients
 * Get all M2M clients for a legal entity
 */
export async function getM2mClients(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legal_entity_id } = req.params;

    const { rows } = await pool.query(`
      SELECT
        m.m2m_client_id,
        m.legal_entity_id,
        m.client_name,
        m.azure_client_id,
        m.assigned_scopes,
        m.is_active,
        m.dt_created,
        m.dt_modified,
        m.legal_entity_endpoint_id,
        e.endpoint_url as "endpointUrl",
        e.endpoint_name as "endpointName"
      FROM m2m_clients m
      LEFT JOIN legal_entity_endpoint e ON m.legal_entity_endpoint_id = e.legal_entity_endpoint_id
      WHERE m.legal_entity_id = $1 AND m.is_deleted = false
      ORDER BY m.dt_created DESC
    `, [legal_entity_id]);

    res.json({ clients: rows });
  } catch (error: any) {
    console.error('Error listing M2M clients:', error);
    res.status(500).json({ error: 'Failed to list M2M clients' });
  }
}

/**
 * POST /v1/legal-entities/:legal_entity_id/m2m-clients
 * Create a new M2M client for a legal entity
 */
export async function createM2mClient(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legal_entity_id } = req.params;
    const { client_name, description, assigned_scopes, legal_entity_endpoint_id } = req.body;

    if (!client_name) {
      res.status(400).json({ error: 'client_name is required' });
      return;
    }

    // Validate that endpoint belongs to the legal entity (if provided)
    if (legal_entity_endpoint_id) {
      const endpointCheck = await pool.query(`
        SELECT legal_entity_id FROM legal_entity_endpoint
        WHERE legal_entity_endpoint_id = $1 AND is_deleted = false
      `, [legal_entity_endpoint_id]);

      if (endpointCheck.rows.length === 0) {
        res.status(404).json({ error: 'Endpoint not found' });
        return;
      }

      if (endpointCheck.rows[0].legal_entity_id !== legal_entity_id) {
        res.status(403).json({ error: 'Endpoint does not belong to this legal entity' });
        return;
      }
    }

    const azureClientId = randomUUID();
    const clientSecret = randomBytes(32).toString('base64');

    // Insert client (secrets are stored separately in m2m_client_secrets_audit or Key Vault)
    const { rows } = await pool.query(`
      INSERT INTO m2m_clients (legal_entity_id, client_name, azure_client_id, description, assigned_scopes, legal_entity_endpoint_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING m2m_client_id, legal_entity_id, client_name, azure_client_id, description, assigned_scopes, legal_entity_endpoint_id, is_active, dt_created
    `, [legal_entity_id, client_name, azureClientId, description || null, assigned_scopes || [], legal_entity_endpoint_id || null]);

    const newClient = rows[0];

    // Record secret generation in audit table
    await pool.query(`
      INSERT INTO m2m_client_secrets_audit (m2m_client_id, secret_generated_at)
      VALUES ($1, NOW())
    `, [newClient.m2m_client_id]);

    // Invalidate M2M clients cache
    invalidateCacheForUser(req, `/v1/legal-entities/${legal_entity_id}/m2m-clients`);

    // Return client data with secret (only shown once - secret not stored in DB)
    res.status(201).json({
      client: newClient,
      client_secret: clientSecret
    });
  } catch (error: any) {
    console.error('Error creating M2M client:', error);
    res.status(500).json({ error: 'Failed to create M2M client' });
  }
}

/**
 * POST /v1/m2m-clients/:m2m_client_id/generate-secret
 * Generate a new secret for an M2M client
 */
export async function generateM2mSecret(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { m2m_client_id } = req.params;

    // Generate a new secret
    const secret = randomBytes(32).toString('base64');
    const secretHash = createHash('sha256').update(secret).digest('hex');

    const { rowCount } = await pool.query(`
      UPDATE m2m_clients SET client_secret_hash = $1, dt_modified = NOW()
      WHERE m2m_client_id = $2 AND is_deleted = false
    `, [secretHash, m2m_client_id]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'M2M client not found' });
      return;
    }

    // Return the secret (only time it's visible)
    res.json({ clientSecret: secret, message: 'Store this secret securely - it cannot be retrieved again' });
  } catch (error: any) {
    console.error('Error generating M2M secret:', error);
    res.status(500).json({ error: 'Failed to generate M2M secret' });
  }
}

/**
 * PATCH /v1/m2m-clients/:m2m_client_id/scopes
 * Update scopes for an M2M client
 */
export async function updateM2mScopes(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { m2m_client_id } = req.params;
    const { scopes } = req.body;

    if (!Array.isArray(scopes)) {
      res.status(400).json({ error: 'scopes must be an array' });
      return;
    }

    const { rows, rowCount } = await pool.query(`
      UPDATE m2m_clients SET assigned_scopes = $1, dt_modified = NOW()
      WHERE m2m_client_id = $2 AND is_deleted = false
      RETURNING m2m_client_id as "clientId", assigned_scopes as "scopes", client_name as "clientName", legal_entity_id
    `, [scopes, m2m_client_id]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'M2M client not found' });
      return;
    }

    // Invalidate M2M clients cache
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/m2m-clients`);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating M2M scopes:', error);
    res.status(500).json({ error: 'Failed to update M2M scopes' });
  }
}

/**
 * DELETE /v1/m2m-clients/:m2m_client_id
 * Soft-delete an M2M client
 */
export async function deleteM2mClient(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { m2m_client_id } = req.params;

    const { rows, rowCount } = await pool.query(`
      UPDATE m2m_clients SET is_deleted = true, dt_modified = NOW()
      WHERE m2m_client_id = $1 AND is_deleted = false
      RETURNING legal_entity_id
    `, [m2m_client_id]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'M2M client not found' });
      return;
    }

    // Invalidate M2M clients cache
    const legalEntityId = rows[0].legal_entity_id;
    invalidateCacheForUser(req, `/v1/legal-entities/${legalEntityId}/m2m-clients`);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deactivating M2M client:', error);
    res.status(500).json({ error: 'Failed to deactivate M2M client' });
  }
}
