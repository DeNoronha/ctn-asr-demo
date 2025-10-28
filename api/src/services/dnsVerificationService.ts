import { promises as dns } from 'dns';
import crypto from 'crypto';
import { query, withTransaction } from '../utils/database';
import { PoolClient } from 'pg';

export interface DNSToken {
  tokenId: string;
  domain: string;
  token: string;
  recordName: string;
  expiresAt: Date;
  status: 'pending' | 'verified' | 'expired' | 'failed';
}

export interface DNSVerificationResult {
  verified: boolean;
  details: string;
  resolverResults?: Array<{
    resolver: string;
    found: boolean;
    records?: string[][];
  }>;
}

export class DnsVerificationService {
  private readonly DNS_RESOLVERS = ['8.8.8.8', '1.1.1.1', '9.9.9.9']; // Google, Cloudflare, Quad9
  private readonly TOKEN_EXPIRY_DAYS = 30;
  private readonly REVERIFICATION_DAYS = 90;

  /**
   * Generate a new DNS verification token
   */
  async generateToken(legalEntityId: string, domain: string): Promise<DNSToken> {
    // Check for existing pending token
    const existingResult = await query(
      `SELECT token_id, token, record_name, expires_at, status
       FROM dns_verification_tokens
       WHERE legal_entity_id = $1
         AND domain = $2
         AND status = 'pending'
         AND expires_at > now()`,
      [legalEntityId, domain]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      return {
        tokenId: existing.token_id,
        domain,
        token: existing.token,
        recordName: existing.record_name,
        expiresAt: new Date(existing.expires_at),
        status: existing.status,
      };
    }

    // Generate new token
    const randomBytes = crypto.randomBytes(24); // 192 bits
    const base32 = randomBytes.toString('base64url').substring(0, 32);
    const token = `ctn-${base32}`;
    const recordName = `_ctn-verify.${domain}`;
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO dns_verification_tokens (
        token_id,
        legal_entity_id,
        domain,
        token,
        record_name,
        expires_at,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', now())`,
      [tokenId, legalEntityId, domain, token, recordName, expiresAt]
    );

    return {
      tokenId,
      domain,
      token,
      recordName,
      expiresAt,
      status: 'pending',
    };
  }

  /**
   * Verify DNS token using multi-resolver consensus
   */
  async verifyToken(tokenId: string): Promise<DNSVerificationResult> {
    // Get token from database
    const tokenResult = await query(
      `SELECT legal_entity_id, domain, token, record_name, status, expires_at
       FROM dns_verification_tokens
       WHERE token_id = $1`,
      [tokenId]
    );

    if (tokenResult.rows.length === 0) {
      return {
        verified: false,
        details: 'Token not found',
      };
    }

    const tokenData = tokenResult.rows[0];

    if (tokenData.status === 'verified') {
      return {
        verified: true,
        details: 'Token already verified',
      };
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      await this.updateTokenStatus(tokenId, 'expired', { error: 'Token expired' });
      return {
        verified: false,
        details: 'Token expired',
      };
    }

    // Perform DNS lookups with multiple resolvers
    const resolverResults: Array<{
      resolver: string;
      found: boolean;
      records?: string[][];
    }> = [];

    for (const resolverIp of this.DNS_RESOLVERS) {
      try {
        const resolver = new dns.Resolver();
        resolver.setServers([resolverIp]);

        const txtRecords = await resolver.resolveTxt(tokenData.record_name);
        const found = txtRecords.some(record =>
          record.some(txt => txt === tokenData.token)
        );

        resolverResults.push({
          resolver: resolverIp,
          found,
          records: txtRecords,
        });
      } catch (error: unknown) {
        resolverResults.push({
          resolver: resolverIp,
          found: false,
        });
      }
    }

    // Require consensus from at least 2 out of 3 resolvers
    const verifiedCount = resolverResults.filter(r => r.found).length;
    const verified = verifiedCount >= 2;

    // Update token status
    const verificationDetails = {
      resolvers: resolverResults,
      verifiedCount,
      totalResolvers: this.DNS_RESOLVERS.length,
      timestamp: new Date().toISOString(),
    };

    if (verified) {
      await this.markTokenAsVerified(tokenId, tokenData.legal_entity_id, tokenData.domain, verificationDetails);
    } else {
      await this.updateTokenStatus(tokenId, 'failed', verificationDetails);
    }

    return {
      verified,
      details: verified
        ? `${verifiedCount} out of ${this.DNS_RESOLVERS.length} resolvers confirmed`
        : `Only ${verifiedCount} out of ${this.DNS_RESOLVERS.length} resolvers confirmed (need 2)`,
      resolverResults,
    };
  }

  /**
   * Mark token as verified and update legal entity tier
   */
  private async markTokenAsVerified(
    tokenId: string,
    legalEntityId: string,
    domain: string,
    verificationDetails: unknown
  ): Promise<void> {
    await withTransaction(async (client: PoolClient) => {
      const now = new Date();
      const reverificationDue = new Date(now.getTime() + this.REVERIFICATION_DAYS * 24 * 60 * 60 * 1000);

      // Update token status
      await client.query(
        `UPDATE dns_verification_tokens
         SET status = 'verified',
             verified_at = $2,
             verification_details = $3,
             last_verification_attempt = $2
         WHERE token_id = $1`,
        [tokenId, now, JSON.stringify(verificationDetails)]
      );

      // Update legal entity tier to Tier 2
      await client.query(
        `UPDATE legal_entity
         SET authentication_tier = 2,
             authentication_method = 'DNS',
             dns_verified_domain = $2,
             dns_verified_at = $3,
             dns_reverification_due = $4,
             dt_modified = $3
         WHERE legal_entity_id = $1`,
        [legalEntityId, domain, now, reverificationDue]
      );
    });
  }

  /**
   * Update token status with details
   */
  private async updateTokenStatus(
    tokenId: string,
    status: 'pending' | 'verified' | 'expired' | 'failed',
    verificationDetails: unknown
  ): Promise<void> {
    await query(
      `UPDATE dns_verification_tokens
       SET status = $2,
           verification_details = $3,
           last_verification_attempt = now(),
           verification_attempts = verification_attempts + 1
       WHERE token_id = $1`,
      [tokenId, status, JSON.stringify(verificationDetails)]
    );
  }

  /**
   * Get pending tokens for a legal entity
   */
  async getPendingTokens(legalEntityId: string): Promise<DNSToken[]> {
    const result = await query(
      `SELECT token_id, domain, token, record_name, expires_at, status
       FROM dns_verification_tokens
       WHERE legal_entity_id = $1
         AND status = 'pending'
         AND expires_at > now()
       ORDER BY created_at DESC`,
      [legalEntityId]
    );

    return result.rows.map(row => ({
      tokenId: row.token_id,
      domain: row.domain,
      token: row.token,
      recordName: row.record_name,
      expiresAt: new Date(row.expires_at),
      status: row.status,
    }));
  }

  /**
   * Re-verify DNS for all Tier 2 entities that are due for reverification
   * Used by scheduled job
   */
  async reverifyExpiredDnsRecords(): Promise<{
    total: number;
    verified: number;
    failed: number;
  }> {
    // Get entities needing reverification
    const entitiesResult = await query(
      `SELECT legal_entity_id, dns_verified_domain
       FROM legal_entity
       WHERE authentication_tier = 2
         AND dns_reverification_due < now()
         AND is_deleted = false`
    );

    const total = entitiesResult.rows.length;
    let verified = 0;
    let failed = 0;

    for (const entity of entitiesResult.rows) {
      try {
        // Generate new token for reverification
        const token = await this.generateToken(entity.legal_entity_id, entity.dns_verified_domain);

        // Immediately verify it
        const result = await this.verifyToken(token.tokenId);

        if (result.verified) {
          verified++;
        } else {
          failed++;
          // Downgrade to Tier 3 if verification fails
          await query(
            `UPDATE legal_entity
             SET authentication_tier = 3,
                 authentication_method = 'EmailVerification',
                 dns_reverification_due = NULL
             WHERE legal_entity_id = $1`,
            [entity.legal_entity_id]
          );
        }
      } catch (error) {
        console.error(`Failed to reverify DNS for entity ${entity.legal_entity_id}:`, error);
        failed++;
      }
    }

    return { total, verified, failed };
  }

  /**
   * Get DNS setup instructions for UI display
   */
  getDnsSetupInstructions(token: DNSToken): {
    recordType: string;
    recordName: string;
    recordValue: string;
    ttl: string;
    instructions: string[];
  } {
    return {
      recordType: 'TXT',
      recordName: token.recordName,
      recordValue: token.token,
      ttl: '3600',
      instructions: [
        'Log in to your DNS provider (e.g., Cloudflare, Route53, GoDaddy)',
        `Add a new TXT record with name: ${token.recordName}`,
        `Set the value to: ${token.token}`,
        'Save the DNS record',
        'Wait 5-10 minutes for DNS propagation',
        'Click "Verify DNS Record" button below',
      ],
    };
  }
}

export const dnsVerificationService = new DnsVerificationService();
