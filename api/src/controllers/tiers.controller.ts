/**
 * Tiers Controller
 *
 * Handles authentication tier management and authorization logging.
 * Three-tier authentication system: Basic (email), Standard (DNS/KvK), Enhanced (eHerkenning)
 *
 * @module controllers/tiers
 */

import { Request, Response } from 'express';
import { getPool } from '../utils/database';

// ============================================================================
// TIER MANAGEMENT
// ============================================================================

/**
 * GET /v1/entities/:legalentityid/tier
 * Get tier information for a legal entity
 */
export async function getTier(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT
        authentication_tier as tier,
        authentication_method as method,
        dns_verified_at as "verifiedAt",
        dns_reverification_due as "reverificationDue",
        eherkenning_level as "eherkenningLevel"
      FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false
    `, [legalentityid]);

    if (rows.length === 0) {
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error fetching tier info:', error);
    res.status(500).json({ error: 'Failed to fetch tier information' });
  }
}

/**
 * PUT /v1/entities/:legalentityid/tier
 * Update tier information for a legal entity
 */
export async function updateTier(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { tier, method, dnsVerifiedDomain, eherkenningIdentifier, eherkenningLevel } = req.body;

    if (!tier || !method) {
      res.status(400).json({ error: 'tier and method are required' });
      return;
    }

    const { rowCount } = await pool.query(`
      UPDATE legal_entity
      SET
        authentication_tier = $1,
        authentication_method = $2,
        dns_verified_domain = $3,
        dns_verified_at = $4,
        eherkenning_identifier = $5,
        eherkenning_level = $6,
        dt_modified = NOW()
      WHERE legal_entity_id = $7 AND is_deleted = false
    `, [tier, method, dnsVerifiedDomain, dnsVerifiedDomain ? new Date() : null, eherkenningIdentifier, eherkenningLevel, legalentityid]);

    if (rowCount === 0) {
      res.status(404).json({ error: 'Legal entity not found' });
      return;
    }

    res.json({ message: 'Tier updated successfully' });
  } catch (error: any) {
    console.error('Error updating tier:', error);
    res.status(500).json({ error: 'Failed to update tier' });
  }
}

/**
 * GET /v1/tiers/requirements
 * Get tier requirements (public endpoint)
 */
export async function getTierRequirements(req: Request, res: Response): Promise<void> {
  try {
    res.json({
      requirements: {
        tier1: {
          name: 'Basic',
          methods: ['email'],
          description: 'Email verification only'
        },
        tier2: {
          name: 'Standard',
          methods: ['dns', 'kvk'],
          description: 'DNS or KvK verification'
        },
        tier3: {
          name: 'Enhanced',
          methods: ['eherkenning'],
          description: 'eHerkenning EH3 or higher'
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching tier requirements:', error);
    res.status(500).json({ error: 'Failed to fetch tier requirements' });
  }
}

// ============================================================================
// AUTHORIZATION LOG
// ============================================================================

/**
 * GET /v1/authorization-log
 * Get authorization decision logs
 */
export async function getAuthorizationLog(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const legalEntityId = req.query.legalEntityId as string;
    const limit = parseInt(req.query.limit as string || '100');
    const offset = parseInt(req.query.offset as string || '0');

    let sql = `
      SELECT
        log_id,
        legal_entity_id,
        user_identifier,
        requested_resource,
        requested_action,
        required_tier,
        user_tier,
        authorization_result,
        denial_reason,
        request_ip_address,
        created_at
      FROM authorization_log
    `;

    const params: (string | number)[] = [];
    if (legalEntityId) {
      sql += ' WHERE legal_entity_id = $1';
      params.push(legalEntityId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);

    res.json({
      data: result.rows,
      pagination: { limit, offset, total: result.rowCount }
    });
  } catch (error: any) {
    console.error('Error fetching authorization log:', error);
    res.status(500).json({ error: 'Failed to fetch authorization log' });
  }
}
