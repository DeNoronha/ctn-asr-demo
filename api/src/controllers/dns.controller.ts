/**
 * DNS Controller
 *
 * Handles DNS verification operations for domain ownership verification.
 * DNS verification is part of Tier 2 authentication.
 *
 * @module controllers/dns
 */

import { Request, Response } from 'express';
import { randomBytes, randomUUID } from 'crypto';
import { getPool } from '../utils/database';
import { dnsVerificationService } from '../services/dnsVerificationService';

// ============================================================================
// DNS VERIFICATION
// ============================================================================

/**
 * POST /v1/entities/:legalentityid/dns/token
 * Generate a DNS verification token for domain ownership
 */
export async function generateDnsToken(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;
    const { domain } = req.body;

    if (!domain) {
      res.status(400).json({ error: 'domain is required' });
      return;
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      res.status(400).json({ error: 'Invalid domain format' });
      return;
    }

    // Check if there's an existing pending token for this entity+domain
    const existingToken = await pool.query(`
      SELECT token_id, domain, token, record_name, expires_at, status
      FROM dns_verification_tokens
      WHERE legal_entity_id = $1 AND domain = $2 AND status = 'pending' AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `, [legalentityid, domain]);

    // If valid token exists, return it instead of creating a new one
    if (existingToken.rows.length > 0) {
      const existing = existingToken.rows[0];
      res.json({
        tokenId: existing.token_id,
        domain: existing.domain,
        token: existing.token,
        recordName: existing.record_name,
        expiresAt: existing.expires_at,
        status: existing.status,
        instructions: {
          recordType: 'TXT',
          recordName: existing.record_name,
          recordValue: existing.token,
          ttl: 3600
        }
      });
      return;
    }

    // Expire any old pending tokens for this entity+domain (handles edge cases)
    await pool.query(`
      UPDATE dns_verification_tokens
      SET status = 'expired'
      WHERE legal_entity_id = $1 AND domain = $2 AND status = 'pending'
    `, [legalentityid, domain]);

    // Generate new token
    const token = randomBytes(32).toString('hex');
    const tokenId = randomUUID();
    const recordName = `_ctn-verify.${domain}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store in database
    await pool.query(`
      INSERT INTO dns_verification_tokens (token_id, legal_entity_id, domain, token, record_name, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    `, [tokenId, legalentityid, domain, token, recordName, expiresAt]);

    res.json({
      tokenId,
      domain,
      token,
      recordName,
      expiresAt,
      status: 'pending',
      instructions: {
        recordType: 'TXT',
        recordName,
        recordValue: token,
        ttl: 3600
      }
    });
  } catch (error: any) {
    console.error('Error generating DNS token:', error);
    res.status(500).json({ error: 'Failed to generate DNS token' });
  }
}

/**
 * POST /v1/dns/verify/:tokenid
 * Verify DNS token by performing actual DNS lookup
 */
export async function verifyDnsToken(req: Request, res: Response): Promise<void> {
  try {
    const { tokenid } = req.params;
    console.log(`[DNS Verification] Starting verification for token: ${tokenid}`);

    // Use the DNS verification service to perform actual DNS lookup
    const result = await dnsVerificationService.verifyToken(tokenid);

    console.log('[DNS Verification] Result:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error: any) {
    console.error('[DNS Verification] Error verifying DNS token:', error);
    res.status(500).json({
      error: 'Failed to verify DNS token',
      details: error.message
    });
  }
}

/**
 * GET /v1/entities/:legalentityid/dns/tokens
 * Get pending DNS verification tokens for a legal entity
 */
export async function getDnsTokens(req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const { legalentityid } = req.params;

    const { rows } = await pool.query(`
      SELECT token_id as "tokenId", domain, token, record_name as "recordName", expires_at as "expiresAt", status
      FROM dns_verification_tokens
      WHERE legal_entity_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
    `, [legalentityid]);

    res.json({ tokens: rows });
  } catch (error: any) {
    console.error('Error fetching pending DNS tokens:', error);
    res.status(500).json({ error: 'Failed to fetch pending DNS tokens' });
  }
}
