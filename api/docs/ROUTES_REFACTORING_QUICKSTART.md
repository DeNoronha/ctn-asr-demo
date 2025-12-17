# Routes Refactoring Quick Start Guide

## Current Status

**Started:** December 17, 2025
**Phase:** Initial setup complete, ready for incremental migration

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
│       └── eori.routes.ts        # EORI registry endpoints
├── controllers/
│   ├── system.controller.ts      # System endpoint logic
│   └── eori.controller.ts        # EORI endpoint logic
└── routes.ts                     # Original file (still in use)
```

## Migration Progress

| Domain | Routes | Status | Files |
|--------|--------|--------|-------|
| System | 2 | ✅ Extracted | system.routes.ts, system.controller.ts |
| EORI | 3 | ✅ Extracted | eori.routes.ts, eori.controller.ts |
| Peppol | 3 | ⏳ Pending | - |
| VIES | 3 | ⏳ Pending | - |
| Belgium | 1 | ⏳ Pending | - |
| KVK | 8 | ⏳ Pending | - |
| LEI | 1 | ⏳ Pending | - |
| German | 1 | ⏳ Pending | - |
| Members | ~24 | ⏳ Pending | - |
| Contacts | ~10 | ⏳ Pending | - |
| Identifiers | ~10 | ⏳ Pending | - |
| Endpoints | ~7 | ⏳ Pending | - |
| M2M | ~5 | ⏳ Pending | - |
| DNS | ~3 | ⏳ Pending | - |
| Tiers | ~3 | ⏳ Pending | - |
| Branding | ~2 | ⏳ Pending | - |
| Applications | ~3 | ⏳ Pending | - |
| Tasks | ~3 | ⏳ Pending | - |
| Audit | ~3 | ⏳ Pending | - |

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

# Test EORI endpoints
curl http://localhost:8080/api/v1/version
curl http://localhost:8080/api/.well-known/jwks
```

## Notes

- The new routes exist alongside the old routes.ts
- Both systems work in parallel during migration
- Full switch happens when all routes are migrated
- Build must pass after each domain extraction
