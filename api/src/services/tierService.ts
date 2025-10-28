import { query } from '../utils/database';

export enum AuthenticationTier {
  TIER_1_EHERKENNING = 1, // Full access: read, write, publish
  TIER_2_DNS = 2,         // Sensitive data read + webhooks
  TIER_3_EMAIL = 3,       // Public data only
}

export enum AuthenticationMethod {
  EHERKENNING = 'eHerkenning',
  DNS = 'DNS',
  EMAIL_VERIFICATION = 'EmailVerification',
}

export interface TierInfo {
  tier: AuthenticationTier;
  method: AuthenticationMethod;
  verifiedAt?: Date;
  reverificationDue?: Date;
  eherkenningLevel?: 'EH3' | 'EH4';
}

export interface AuthorizationCheck {
  granted: boolean;
  userTier: AuthenticationTier;
  requiredTier: AuthenticationTier;
  denialReason?: string;
}

export class TierService {
  /**
   * Get tier information for a legal entity
   */
  async getTierInfo(legalEntityId: string): Promise<TierInfo | null> {
    const result = await query(
      `SELECT
        authentication_tier,
        authentication_method,
        dns_verified_at,
        dns_reverification_due,
        eherkenning_level
      FROM legal_entity
      WHERE legal_entity_id = $1 AND is_deleted = false`,
      [legalEntityId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      tier: row.authentication_tier,
      method: row.authentication_method as AuthenticationMethod,
      verifiedAt: row.dns_verified_at ? new Date(row.dns_verified_at) : undefined,
      reverificationDue: row.dns_reverification_due ? new Date(row.dns_reverification_due) : undefined,
      eherkenningLevel: row.eherkenning_level,
    };
  }

  /**
   * Update tier for a legal entity
   */
  async updateTier(
    legalEntityId: string,
    tier: AuthenticationTier,
    method: AuthenticationMethod,
    additionalData?: {
      dnsVerifiedDomain?: string;
      dnsVerifiedAt?: Date;
      eherkenningIdentifier?: string;
      eherkenningLevel?: 'EH3' | 'EH4';
    }
  ): Promise<void> {
    const dnsReverificationDue = tier === AuthenticationTier.TIER_2_DNS && additionalData?.dnsVerifiedAt
      ? new Date(additionalData.dnsVerifiedAt.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
      : null;

    await query(
      `UPDATE legal_entity
      SET
        authentication_tier = $2,
        authentication_method = $3,
        dns_verified_domain = $4,
        dns_verified_at = $5,
        dns_reverification_due = $6,
        eherkenning_identifier = $7,
        eherkenning_level = $8,
        dt_modified = now()
      WHERE legal_entity_id = $1`,
      [
        legalEntityId,
        tier,
        method,
        additionalData?.dnsVerifiedDomain || null,
        additionalData?.dnsVerifiedAt || null,
        dnsReverificationDue,
        additionalData?.eherkenningIdentifier || null,
        additionalData?.eherkenningLevel || null,
      ]
    );
  }

  /**
   * Check if a legal entity is authorized to access a resource
   * @param legalEntityId - The legal entity attempting access
   * @param requiredTier - Minimum tier required (1 = most privileged, 3 = least)
   * @returns Authorization result
   */
  async checkAuthorization(
    legalEntityId: string,
    requiredTier: AuthenticationTier
  ): Promise<AuthorizationCheck> {
    const tierInfo = await this.getTierInfo(legalEntityId);

    if (!tierInfo) {
      return {
        granted: false,
        userTier: AuthenticationTier.TIER_3_EMAIL,
        requiredTier,
        denialReason: 'Legal entity not found',
      };
    }

    // Lower tier number = higher privilege (1 > 2 > 3)
    const granted = tierInfo.tier <= requiredTier;

    // Check if DNS verification has expired
    if (
      tierInfo.tier === AuthenticationTier.TIER_2_DNS &&
      tierInfo.reverificationDue &&
      new Date() > tierInfo.reverificationDue
    ) {
      return {
        granted: false,
        userTier: tierInfo.tier,
        requiredTier,
        denialReason: 'DNS verification expired - re-verification required',
      };
    }

    return {
      granted,
      userTier: tierInfo.tier,
      requiredTier,
      denialReason: granted
        ? undefined
        : `Insufficient tier: requires ${this.getTierName(requiredTier)}, user has ${this.getTierName(tierInfo.tier)}`,
    };
  }

  /**
   * Log authorization attempt for audit trail
   */
  async logAuthorizationAttempt(
    legalEntityId: string,
    userIdentifier: string,
    requestedResource: string,
    requestedAction: string,
    authCheck: AuthorizationCheck,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      requestPath?: string;
    }
  ): Promise<void> {
    await query(
      `INSERT INTO authorization_log (
        legal_entity_id,
        user_identifier,
        requested_resource,
        requested_action,
        required_tier,
        user_tier,
        authorization_result,
        denial_reason,
        request_ip_address,
        request_user_agent,
        request_path,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        legalEntityId,
        userIdentifier,
        requestedResource,
        requestedAction,
        authCheck.requiredTier,
        authCheck.userTier,
        authCheck.granted ? 'granted' : 'denied',
        authCheck.denialReason || null,
        metadata?.ipAddress || null,
        metadata?.userAgent || null,
        metadata?.requestPath || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  }

  /**
   * Get legal entities that need DNS re-verification
   * @returns Array of legal entity IDs that need re-verification
   */
  async getEntitiesNeedingDnsReverification(): Promise<string[]> {
    const result = await query(
      `SELECT legal_entity_id
      FROM legal_entity
      WHERE
        authentication_tier = $1
        AND dns_reverification_due IS NOT NULL
        AND dns_reverification_due < now()
        AND is_deleted = false`,
      [AuthenticationTier.TIER_2_DNS]
    );

    return result.rows.map(row => row.legal_entity_id);
  }

  /**
   * Get human-readable tier name
   */
  private getTierName(tier: AuthenticationTier): string {
    switch (tier) {
      case AuthenticationTier.TIER_1_EHERKENNING:
        return 'Tier 1 (eHerkenning)';
      case AuthenticationTier.TIER_2_DNS:
        return 'Tier 2 (DNS Verification)';
      case AuthenticationTier.TIER_3_EMAIL:
        return 'Tier 3 (Email Verification)';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get tier requirements summary for UI display
   */
  getTierRequirements(): Record<AuthenticationTier, { name: string; access: string; method: string }> {
    return {
      [AuthenticationTier.TIER_1_EHERKENNING]: {
        name: 'Tier 1',
        access: 'Full access (read, write, publish)',
        method: 'eHerkenning EH3/EH4',
      },
      [AuthenticationTier.TIER_2_DNS]: {
        name: 'Tier 2',
        access: 'Sensitive data read + webhooks',
        method: 'DNS TXT record verification',
      },
      [AuthenticationTier.TIER_3_EMAIL]: {
        name: 'Tier 3',
        access: 'Public data only',
        method: 'Email + KvK document',
      },
    };
  }
}

export const tierService = new TierService();
