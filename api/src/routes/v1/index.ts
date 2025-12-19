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
import membersRoutes from './members.routes';
import contactsRoutes from './contacts.routes';
import identifiersRoutes from './identifiers.routes';
import eoriRoutes from './eori.routes';
import peppolRoutes from './peppol.routes';
import viesRoutes from './vies.routes';
import registriesRoutes from './registries.routes';
import endpointsRoutes from './endpoints.routes';
import auditRoutes from './audit.routes';
import applicationsRoutes from './applications.routes';
import tasksRoutes from './tasks.routes';
import tiersRoutes from './tiers.routes';
import dnsRoutes from './dns.routes';
import m2mRoutes from './m2m.routes';
import memberPortalRoutes from './member-portal.routes';
import kvkVerificationRoutes from './kvk-verification.routes';
import brandingRoutes from './branding.routes';
import registrationRoutes from './registration.routes';
import enrichmentRoutes from './enrichment.routes';

const router = Router();

// System routes (version, JWKS) - no /v1 prefix for well-known
router.use(systemRoutes);

// Core entity routes
router.use(membersRoutes);
router.use(contactsRoutes);
router.use(identifiersRoutes);

// Registry validation routes (EU-wide)
router.use(eoriRoutes);
router.use(peppolRoutes);
router.use(viesRoutes);

// Country-specific registry routes (LEI, KVK, German, Belgium)
router.use(registriesRoutes);

// Endpoint management routes
router.use(endpointsRoutes);

// Audit logging routes
router.use(auditRoutes);

// Application workflow routes
router.use(applicationsRoutes);

// Admin task management routes
router.use(tasksRoutes);

// Authentication tier management routes
router.use(tiersRoutes);

// DNS verification routes
router.use(dnsRoutes);

// M2M client management routes
router.use(m2mRoutes);

// Member portal self-service routes
router.use(memberPortalRoutes);

// KVK verification routes
router.use(kvkVerificationRoutes);

// Branding routes
router.use(brandingRoutes);

// Public registration routes (no auth required)
router.use(registrationRoutes);

// Enrichment routes
router.use(enrichmentRoutes);

export default router;
