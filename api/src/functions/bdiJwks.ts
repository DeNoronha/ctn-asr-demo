// ========================================
// BDI JWKS Endpoint
// ========================================
// Exposes CTN's public keys for BVAD signature verification
// Endpoint: /.well-known/jwks

import { app, HttpResponseInit, InvocationContext, HttpRequest } from '@azure/functions';
import { importSPKI, exportJWK } from 'jose';
import { handleError } from '../utils/errors';

/**
 * JWKS Handler
 * Returns JSON Web Key Set for BVAD signature verification
 */
async function handler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('BDI JWKS endpoint called');

  try {
    // Get public key from environment
    const publicKeyPem = process.env.BDI_PUBLIC_KEY;
    const keyId = process.env.BDI_KEY_ID || 'ctn-bdi-2025-001';

    if (!publicKeyPem) {
      context.warn('BDI_PUBLIC_KEY not configured');
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'jwks_not_configured',
          error_description: 'Public key not configured on server',
        }),
      };
    }

    // Convert PEM public key to JWK format using jose library
    const publicKey = await importSPKI(publicKeyPem, 'RS256');
    const jwk = await exportJWK(publicKey);

    // Build JWKS response with proper key parameters
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

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Public endpoint
      },
      body: JSON.stringify(jwks, null, 2),
    };
  } catch (error) {
    context.error('Error generating JWKS:', error);

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'internal_server_error',
        error_description: 'Failed to generate JWKS',
      }),
    };
  }
}

// Register endpoint (public, no authentication required)
app.http('bdiJwks', {
  methods: ['GET', 'OPTIONS'],
  route: '.well-known/jwks',
  authLevel: 'anonymous',
  handler: handler,
});
