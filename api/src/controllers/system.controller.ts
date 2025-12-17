/**
 * System Controller
 *
 * Handles system-level endpoints like version info and JWKS discovery.
 *
 * @module controllers/system
 */

import { Request, Response } from 'express';

/**
 * GET /v1/version
 * Returns API version and environment information
 */
export async function getVersion(req: Request, res: Response): Promise<void> {
  res.json({
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'production',
    runtime: 'container-apps',
    timestamp: new Date().toISOString()
  });
}

/**
 * GET /.well-known/jwks
 * JWKS Discovery Endpoint for BDI signature verification
 * Exposes CTN's public keys for external systems to verify signatures
 */
export async function getJwks(req: Request, res: Response): Promise<void> {
  try {
    const { importSPKI, exportJWK } = await import('jose');

    const publicKeyPem = process.env.BDI_PUBLIC_KEY;
    const keyId = process.env.BDI_KEY_ID || 'ctn-bdi-2025-001';

    if (!publicKeyPem) {
      console.warn('BDI_PUBLIC_KEY not configured');
      res.status(500).json({
        error: 'jwks_not_configured',
        error_description: 'Public key not configured on server',
      });
      return;
    }

    // Convert PEM public key to JWK format
    const publicKey = await importSPKI(publicKeyPem, 'RS256');
    const jwk = await exportJWK(publicKey);

    // Build JWKS response
    const jwks = {
      keys: [
        {
          ...jwk,
          use: 'sig',
          alg: 'RS256',
          kid: keyId,
        },
      ],
    };

    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Access-Control-Allow-Origin': '*', // Public endpoint
    });

    res.json(jwks);
  } catch (error: any) {
    console.error('Error generating JWKS:', error);
    res.status(500).json({
      error: 'internal_server_error',
      error_description: 'Failed to generate JWKS',
    });
  }
}
