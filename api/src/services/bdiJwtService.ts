// ========================================
// BDI JWT Service
// ========================================
// Handles signing and validation of BDI tokens (BVAD/BVOD)
// Uses RS256 asymmetric signing with JWKS key discovery

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// BDI Schema namespace
const BDI_SCHEMA_BASE = 'https://schemas.connectedtradenetwork.org/claims';

// CTN issuer URL
const CTN_ISSUER = process.env.CTN_ISSUER_URL || 'https://www.connectedtradenetwork.org';
const CTN_AUDIENCE = `${BDI_SCHEMA_BASE}/ctn_audience`;

/**
 * RSA Key Pair Management
 * In production, these should be loaded from Azure Key Vault or secure storage
 * For development, generate keys with: openssl genrsa -out private.key 2048
 */
const PRIVATE_KEY = process.env.BDI_PRIVATE_KEY || `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAyVn+Rl7N8F6iCqrKq4f9LvPzXzMFyVwK/fP7ZhOFqPQKvNn5
FEWBPwK4g7Qz2KqrXQ7N9Yx8m9LqZPvJ7VfYqQzN8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8QIDAQABAoIBADy2Vq+ZPZN8qZPq
K yN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6
Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8ECgYEA9qZPqKyN8F6Z8qZPqKyN8
F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8
qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPq
KyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8
F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8
qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8CgYEA0qZPqKyN8F6
Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8CgYAqZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8CgYBqZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8CgYBqZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8==
-----END RSA PRIVATE KEY-----`;

const PUBLIC_KEY = process.env.BDI_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyVn+Rl7N8F6iCqrKq4f9
LvPzXzMFyVwK/fP7ZhOFqPQKvNn5FEWBPwK4g7Qz2KqrXQ7N9Yx8m9LqZPvJ7VfY
qQzN8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z
8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZP
qKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN
8F6Z8qZPqKyN8F6Z8qZPqKyN8F6Z8qZPqKyN8QIDAQABAnot-----END PUBLIC KEY-----`;

// Key ID for JWKS
const KEY_ID = process.env.BDI_KEY_ID || 'ctn-bdi-2025-001';

/**
 * Build BDI claim URI
 */
export function buildBdiClaim(category: string, attribute: string): string {
  return `${BDI_SCHEMA_BASE}/${category}/${attribute}`;
}

/**
 * BVAD Claims Interface
 */
export interface BvadClaims {
  // Standard JWT claims
  iss: string; // Issuer
  sub: string; // Subject (member domain)
  aud: string | string[]; // Audience
  iat: number; // Issued at
  exp: number; // Expiration
  jti: string; // JWT ID

  // BDI document claims
  [key: string]: any; // Custom BDI claims use full URIs
}

/**
 * Registry Identifier Interface
 */
export interface RegistryIdentifier {
  type: string; // KVK, LEI, EUID, HRB, SIREN, etc.
  value: string;
  countryCode?: string; // ISO 3166-1 alpha-2
  registryName?: string; // e.g., "IHK Berlin", "KvK"
}

/**
 * Generate BVAD token for a member
 */
export function generateBvad(memberData: {
  memberDomain: string;
  legalName: string;
  kvk?: string;
  lei?: string;
  euid?: string; // European Unique Identifier
  registryIdentifiers?: RegistryIdentifier[]; // Additional/alternative identifiers
  countryCode?: string; // Primary country of registration
  status: string;
  complianceChecked: boolean;
  complianceLastChecked?: Date;
  ownerChecked: boolean;
  ownerLastChecked?: Date;
  termsVersion?: string;
  termsAcceptedAt?: Date;
  adminContact?: {
    name: string;
    email: string;
    role?: string;
    phone?: string;
  };
  bdiConnectorUri?: string;
  validityHours?: number; // Default 24 hours
}): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (memberData.validityHours || 24) * 3600;
  const jti = crypto.randomBytes(16).toString('hex');

  // Build claims with BDI namespaced URIs
  const claims: BvadClaims = {
    // Standard JWT claims
    iss: CTN_ISSUER,
    sub: `https://${memberData.memberDomain}`,
    aud: CTN_AUDIENCE,
    iat: now,
    exp,
    jti,

    // BDI document type
    [buildBdiClaim('document', 'type')]: 'CTN Verifiable Assurance Document',
    [buildBdiClaim('document', 'type_uri')]: 'https://docs.connectedtradenetwork.org/bvad/v1',

    // Legal entity claims
    [buildBdiClaim('legal_entity', 'name')]: memberData.legalName,
    [buildBdiClaim('legal_entity', 'domain')]: memberData.memberDomain,
  };

  // Add primary country code if present
  if (memberData.countryCode) {
    claims[buildBdiClaim('legal_entity', 'country_code')] = memberData.countryCode;
  }

  // Add registry identifiers if present
  if (memberData.kvk) {
    claims[buildBdiClaim('legal_entity', 'registry/kvk')] = memberData.kvk;
  }
  if (memberData.lei) {
    claims[buildBdiClaim('legal_entity', 'registry/lei')] = memberData.lei;
  }
  if (memberData.euid) {
    claims[buildBdiClaim('legal_entity', 'registry/euid')] = memberData.euid;
  }

  // Add additional registry identifiers
  if (memberData.registryIdentifiers && memberData.registryIdentifiers.length > 0) {
    memberData.registryIdentifiers.forEach((identifier) => {
      // Use normalized type for claim (lowercase, replace spaces with underscores)
      const claimType = identifier.type.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const claimKey = buildBdiClaim('legal_entity', `registry/${claimType}`);

      // Store as object with full details
      claims[claimKey] = {
        value: identifier.value,
        country_code: identifier.countryCode,
        registry_name: identifier.registryName,
      };
    });
  }

  // Add BDI connector info if present
  if (memberData.bdiConnectorUri) {
    claims[buildBdiClaim('legal_entity', 'bdi_connector_endpoint_uri')] = memberData.bdiConnectorUri;
    claims[buildBdiClaim('legal_entity', 'bdi_connector_endpoint_authentication_method')] = 'Bearer';
  }

  // Compliance claims
  claims[buildBdiClaim('compliance', 'owner_checked')] = memberData.ownerChecked;
  if (memberData.ownerLastChecked) {
    claims[buildBdiClaim('compliance', 'owner_last_checked_at')] =
      Math.floor(memberData.ownerLastChecked.getTime() / 1000);
  }

  claims[buildBdiClaim('compliance', 'compliance_checked')] = memberData.complianceChecked;
  if (memberData.complianceLastChecked) {
    claims[buildBdiClaim('compliance', 'compliance_last_checked_at')] =
      Math.floor(memberData.complianceLastChecked.getTime() / 1000);
  }

  // Member status
  claims[buildBdiClaim('compliance', 'status')] = memberData.status;

  // Terms claims
  if (memberData.termsVersion) {
    claims[buildBdiClaim('terms', 'version')] = memberData.termsVersion;
    claims[buildBdiClaim('terms', 'uri')] = `https://www.connectedtradenetwork.org/terms/${memberData.termsVersion}`;
    if (memberData.termsAcceptedAt) {
      claims[buildBdiClaim('terms', 'accepted_at')] =
        Math.floor(memberData.termsAcceptedAt.getTime() / 1000);
    }
  }

  // Contact claims
  if (memberData.adminContact) {
    claims[buildBdiClaim('subject', 'admin_contact')] = {
      name: memberData.adminContact.name,
      email: memberData.adminContact.email,
      role: memberData.adminContact.role || 'Administrator',
      phone: memberData.adminContact.phone,
    };
  }

  // Sign the token with RS256
  const token = jwt.sign(claims, PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: KEY_ID,
  });

  return token;
}

/**
 * Verify and decode a BVOD token
 */
export interface BvodClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  iat: number;
  exp: number;
  nbf?: number;
  jti: string;
  kid?: string;

  // Orchestration claims
  [key: string]: any;
}

export interface BvodValidationResult {
  valid: boolean;
  reason?: string;
  claims?: BvodClaims;
  expired?: boolean;
  notYetValid?: boolean;
  signatureValid?: boolean;
}

/**
 * Validate BVOD token signature and claims
 * Note: This validates the token format and standard claims
 * Business logic validation (e.g., checking member involvement) happens separately
 */
export async function validateBvodToken(
  token: string,
  issuerPublicKey?: string
): Promise<BvodValidationResult> {
  try {
    // Decode without verification first to get issuer
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded === 'string') {
      return {
        valid: false,
        reason: 'Invalid token format',
      };
    }

    const payload = decoded.payload as BvodClaims;

    // In production, fetch public key from issuer's JWKS endpoint
    // For now, use provided key or skip signature verification
    const publicKey = issuerPublicKey || PUBLIC_KEY;

    try {
      // Verify token signature and claims
      const verified = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as BvodClaims;

      // Additional claim validation
      const now = Math.floor(Date.now() / 1000);

      // Check expiration
      if (verified.exp && verified.exp < now) {
        return {
          valid: false,
          reason: 'Token has expired',
          claims: verified,
          expired: true,
          signatureValid: true,
        };
      }

      // Check not-before
      if (verified.nbf && verified.nbf > now) {
        return {
          valid: false,
          reason: 'Token not yet valid',
          claims: verified,
          notYetValid: true,
          signatureValid: true,
        };
      }

      // Validate required BDI claims
      const docType = verified[buildBdiClaim('document', 'type')];
      if (docType !== 'CTN Verifiable Orchestration Document') {
        return {
          valid: false,
          reason: 'Not a valid BVOD token',
          claims: verified,
          signatureValid: true,
        };
      }

      return {
        valid: true,
        claims: verified,
        signatureValid: true,
        expired: false,
        notYetValid: false,
      };
    } catch (verifyError) {
      return {
        valid: false,
        reason: `Signature verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`,
        claims: payload,
        signatureValid: false,
      };
    }
  } catch (error) {
    return {
      valid: false,
      reason: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get JWKS (JSON Web Key Set) for public key distribution
 */
export function getJwks(): object {
  // Convert PEM public key to JWK format
  // In production, this should use proper JWK conversion library
  // For now, return minimal JWKS structure

  return {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: KEY_ID,
        n: '...',  // Base64url-encoded modulus (extracted from public key)
        e: 'AQAB', // Base64url-encoded exponent (typically 65537)
      },
    ],
  };
}

/**
 * Extract orchestration details from BVOD token
 */
export function extractOrchestrationDetails(claims: BvodClaims): {
  internalOrderId?: string;
  internalUuid?: string;
  businessKeys?: Record<string, string>;
  orchestrator?: any;
  customer?: any;
  subjectCompany?: any;
  participants?: string[]; // Domains from audience
} {
  return {
    internalOrderId: claims[buildBdiClaim('orchestration', 'internal_order_identifier')],
    internalUuid: claims[buildBdiClaim('orchestration', 'internal_uuid')],
    businessKeys: claims[buildBdiClaim('orchestration', 'keys')],
    orchestrator: claims[buildBdiClaim('orchestration', 'orchestrator')],
    customer: claims[buildBdiClaim('orchestration', 'customer')],
    subjectCompany: claims[buildBdiClaim('orchestration', 'subject_company')],
    participants: Array.isArray(claims.aud) ? claims.aud : [claims.aud],
  };
}
