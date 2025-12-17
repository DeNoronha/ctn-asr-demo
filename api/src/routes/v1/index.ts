/**
 * V1 API Route Aggregator
 *
 * Aggregates all v1 API routes from domain-specific route files.
 * Each route file handles a specific domain (members, contacts, etc.)
 *
 * @module routes/v1
 */

import { Router } from 'express';

// Import domain-specific routes
import systemRoutes from './system.routes';
import eoriRoutes from './eori.routes';

const router = Router();

// System routes (version, JWKS) - no /v1 prefix for well-known
router.use(systemRoutes);

// EORI registry routes
router.use(eoriRoutes);

// Future route imports will be added here as we migrate:
// import membersRoutes from './members.routes';
// import contactsRoutes from './contacts.routes';
// import identifiersRoutes from './identifiers.routes';
// import endpointsRoutes from './endpoints.routes';
// import registriesRoutes from './registries.routes';
// import peppolRoutes from './peppol.routes';
// import viesRoutes from './vies.routes';
// import tokensRoutes from './tokens.routes';
// import m2mRoutes from './m2m.routes';
// import dnsRoutes from './dns.routes';
// import tiersRoutes from './tiers.routes';
// import brandingRoutes from './branding.routes';
// import applicationsRoutes from './applications.routes';
// import tasksRoutes from './tasks.routes';
// import auditRoutes from './audit.routes';

export default router;
