/**
 * DNS Routes
 *
 * Routes for DNS verification operations for domain ownership verification.
 * DNS verification is part of Tier 2 authentication.
 *
 * Routes:
 * - POST /v1/entities/:legalentityid/dns/token - Generate DNS verification token
 * - POST /v1/dns/verify/:tokenid - Verify DNS token
 * - GET  /v1/entities/:legalentityid/dns/tokens - Get pending DNS tokens
 *
 * @module routes/v1/dns
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as dnsController from '../../controllers/dns.controller';

const router = Router();

// ============================================================================
// DNS VERIFICATION
// ============================================================================

/**
 * POST /v1/entities/:legalentityid/dns/token
 * Generate a DNS verification token for domain ownership
 * Requires authentication
 */
router.post('/v1/entities/:legalentityid/dns/token', requireAuth, dnsController.generateDnsToken);

/**
 * POST /v1/dns/verify/:tokenid
 * Verify DNS token by performing actual DNS lookup
 * Requires authentication
 */
router.post('/v1/dns/verify/:tokenid', requireAuth, dnsController.verifyDnsToken);

/**
 * GET /v1/entities/:legalentityid/dns/tokens
 * Get pending DNS verification tokens for a legal entity
 * Requires authentication
 */
router.get('/v1/entities/:legalentityid/dns/tokens', requireAuth, dnsController.getDnsTokens);

export default router;
