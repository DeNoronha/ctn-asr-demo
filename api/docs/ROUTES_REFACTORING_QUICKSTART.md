# Routes Refactoring Quick Start Guide

## Current Status

**Started:** December 17, 2025
**Last Updated:** December 19, 2025
**Phase:** COMPLETE - Switchover done, routes-legacy.ts archived

## Structure Created

```
api/src/
├── routes/
│   ├── index.ts                  # Main route aggregator
│   ├── middleware/
│   │   └── requireAuth.ts        # Extracted auth middleware
│   └── v1/
│       ├── index.ts              # V1 route aggregator
│       ├── system.routes.ts      # System endpoints (version, JWKS)
│       ├── members.routes.ts     # Members & legal entity CRUD
│       ├── contacts.routes.ts    # Contact CRUD endpoints + member-contacts
│       ├── identifiers.routes.ts # Identifier CRUD & validation
│       ├── eori.routes.ts        # EORI registry endpoints
│       ├── peppol.routes.ts      # Peppol directory endpoints
│       ├── vies.routes.ts        # VIES VAT validation endpoints
│       ├── registries.routes.ts  # Country-specific registry endpoints
│       ├── endpoints.routes.ts   # Endpoint CRUD + member-endpoints
│       ├── audit.routes.ts       # Audit log operations
│       ├── applications.routes.ts # Application workflow
│       ├── tasks.routes.ts       # Admin task management
│       ├── tiers.routes.ts       # Authentication tier management
│       ├── dns.routes.ts         # DNS verification
│       ├── m2m.routes.ts         # M2M client management
│       ├── member-portal.routes.ts # Member self-service routes
│       ├── kvk-verification.routes.ts # KVK document verification
│       ├── branding.routes.ts    # Legal entity branding
│       ├── registration.routes.ts # Public registration (no auth)
│       └── enrichment.routes.ts  # Unified enrichment endpoint
├── controllers/
│   ├── system.controller.ts      # System endpoint logic
│   ├── members.controller.ts     # Members & legal entity logic
│   ├── contacts.controller.ts    # Contact CRUD logic + member-contacts
│   ├── identifiers.controller.ts # Identifier CRUD & validation logic
│   ├── eori.controller.ts        # EORI endpoint logic
│   ├── peppol.controller.ts      # Peppol endpoint logic
│   ├── vies.controller.ts        # VIES endpoint logic
│   ├── registries.controller.ts  # LEI, KVK, German, Belgium logic
│   ├── endpoints.controller.ts   # Endpoint CRUD + SSRF protection
│   ├── audit.controller.ts       # Audit log operations
│   ├── applications.controller.ts # Application approve/reject workflow
│   ├── tasks.controller.ts       # Admin task management
│   ├── tiers.controller.ts       # Tier management + authorization log
│   ├── dns.controller.ts         # DNS verification operations
│   ├── m2m.controller.ts         # M2M client CRUD operations
│   ├── member-portal.controller.ts # Member self-service logic
│   ├── kvk-verification.controller.ts # KVK document verification logic
│   ├── branding.controller.ts    # Legal entity branding logic
│   ├── registration.controller.ts # Public registration logic
│   └── enrichment.controller.ts  # Unified enrichment logic
└── routes-legacy.ts              # Original file (archived, kept for reference)
```

## Migration Progress

| Domain | Routes | Status | Files |
|--------|--------|--------|-------|
| System | 2 | ✅ Extracted | system.routes.ts, system.controller.ts |
| Members | 9 | ✅ Extracted | members.routes.ts, members.controller.ts |
| Contacts | 9 | ✅ Extracted | contacts.routes.ts, contacts.controller.ts |
| Identifiers | 8 | ✅ Extracted | identifiers.routes.ts, identifiers.controller.ts |
| EORI | 3 | ✅ Extracted | eori.routes.ts, eori.controller.ts |
| Peppol | 3 | ✅ Extracted | peppol.routes.ts, peppol.controller.ts |
| VIES | 3 | ✅ Extracted | vies.routes.ts, vies.controller.ts |
| LEI | 1 | ✅ Extracted | registries.routes.ts, registries.controller.ts |
| KVK | 1 | ✅ Extracted | registries.routes.ts, registries.controller.ts |
| German | 1 | ✅ Extracted | registries.routes.ts, registries.controller.ts |
| Belgium | 1 | ✅ Extracted | registries.routes.ts, registries.controller.ts |
| Endpoints | 7 | ✅ Extracted | endpoints.routes.ts, endpoints.controller.ts |
| Audit | 2 | ✅ Extracted | audit.routes.ts, audit.controller.ts |
| Applications | 3 | ✅ Extracted | applications.routes.ts, applications.controller.ts |
| Tasks | 3 | ✅ Extracted | tasks.routes.ts, tasks.controller.ts |
| Tiers | 4 | ✅ Extracted | tiers.routes.ts, tiers.controller.ts |
| DNS | 3 | ✅ Extracted | dns.routes.ts, dns.controller.ts |
| M2M | 5 | ✅ Extracted | m2m.routes.ts, m2m.controller.ts |
| Member Portal | 6 | ✅ Extracted | member-portal.routes.ts, member-portal.controller.ts |
| KVK Verification | 3 | ✅ Extracted | kvk-verification.routes.ts, kvk-verification.controller.ts |
| Branding | 2 | ✅ Extracted | branding.routes.ts, branding.controller.ts |
| Registration | 1 | ✅ Extracted | registration.routes.ts, registration.controller.ts |
| Enrichment | 1 | ✅ Extracted | enrichment.routes.ts, enrichment.controller.ts |
| KVK Document | 4 | ✅ Extracted | kvk-verification.routes.ts (extended) |

**Total Extracted:** ~83 routes across 23 controller files

## How to Continue Migration

### 1. Extract a Domain

For each domain, create two files:

**Route file:** `routes/v1/{domain}.routes.ts`
```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as controller from '../../controllers/{domain}.controller';

const router = Router();

router.get('/v1/{path}', requireAuth, controller.functionName);
// ... more routes

export default router;
```

**Controller file:** `controllers/{domain}.controller.ts`
```typescript
import { Request, Response } from 'express';
import { getPool } from '../utils/database';

export async function functionName(req: Request, res: Response): Promise<void> {
  // Business logic moved from routes.ts
}
```

### 2. Register in V1 Index

Edit `routes/v1/index.ts`:
```typescript
import newDomainRoutes from './newDomain.routes';

// Add to router
router.use(newDomainRoutes);
```

### 3. Remove from routes.ts

Once verified working, remove the corresponding routes from `routes.ts`.

### 4. Build and Test

```bash
cd api
npm run build
npm start  # Test locally
```

## Switching to New Router

When ready to fully switch over, update `server.ts`:

```typescript
// Old (current):
import { router } from './routes';
app.use('/api', router);

// New (after full migration):
import routes from './routes';
app.use('/api', routes);
```

## Key Files Reference

- **Main aggregator:** `api/src/routes/index.ts`
- **V1 aggregator:** `api/src/routes/v1/index.ts`
- **Auth middleware:** `api/src/routes/middleware/requireAuth.ts`
- **Original routes:** `api/src/routes.ts` (5,513 lines)
- **Full plan:** `api/docs/ROUTES_REFACTORING_PLAN.md`
- **Architecture diagrams:** `api/docs/ROUTES_ARCHITECTURE_DIAGRAM.md`

## Testing Commands

```bash
# Build
cd api && npm run build

# Start locally
npm start

# Test endpoints
curl http://localhost:8080/api/v1/version
curl http://localhost:8080/api/.well-known/jwks
```

## Notes

- All routes have been extracted to modular controller/routes files
- The old routes.ts has been renamed to routes-legacy.ts (archived)
- server.ts now imports from routes/index.ts (the new modular structure)
- Build passed with all 23 schema contract tests
- Security features preserved: SSRF protection (endpoints), IDOR protection (endpoints, tiers)

## Completed Actions

1. ✅ Extracted all routes to modular controller/routes files
2. ✅ Switched server.ts to use new routes
3. ✅ Renamed routes.ts to routes-legacy.ts
4. ✅ Updated schema contract tests to reference routes-legacy.ts
5. ✅ Build verified with all 23 tests passing

## Key Changes Made

- `api/src/routes.ts` → `api/src/routes-legacy.ts` (archived)
- `api/src/routes/index.ts` now serves as the main router
- 21 route files in `api/src/routes/v1/`
- 23 controller files in `api/src/controllers/`
