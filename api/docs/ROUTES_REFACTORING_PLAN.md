# Routes.ts Refactoring Plan

## Current State Analysis

**File:** `api/src/routes.ts`
- **Total Lines:** 5,513 lines
- **Total Routes:** 87 route definitions
- **Average Lines per Route:** ~63 lines (including inline business logic)
- **Status:** UNMAINTAINABLE - Single massive file with all business logic embedded

## Problems Identified

1. **Monolithic Structure** - All routes in single 5500+ line file
2. **Embedded Business Logic** - Complex database queries and business logic inline in route handlers
3. **Code Duplication** - Similar patterns repeated across routes (pagination, error handling, auth checks)
4. **Poor Testability** - Cannot test business logic independently from HTTP layer
5. **Merge Conflicts** - High risk when multiple developers work on different features
6. **Poor Discoverability** - Hard to find specific routes or understand API surface
7. **Violation of SRP** - Single file responsible for routing, validation, business logic, data access

## Route Analysis by Domain

### Members & Legal Entities (24 routes)
```
GET    /v1/members
GET    /v1/all-members
GET    /v1/legal-entities
GET    /v1/legal-entities/:legalentityid
POST   /v1/legal-entities
PUT    /v1/legal-entities/:legalentityid
DELETE /v1/legal-entities/:legalentityid
PUT    /v1/members/:legalEntityId/status
PATCH  /v1/members/:legalEntityId/status
GET    /v1/member (self-service)
POST   /v1/register-member (public registration)
POST   /v1/legal-entities/:legalentityid/enrich
```

### Contacts (10 routes)
```
GET    /v1/contacts/:contactId
POST   /v1/contacts
PUT    /v1/contacts/:contactId
DELETE /v1/contacts/:contactId
GET    /v1/legal-entities/:legalentityid/contacts
POST   /v1/legal-entities/:legalentityid/contacts
PUT    /v1/legal-entities/:legalentityid/contacts/:contactId
DELETE /v1/legal-entities/:legalentityid/contacts/:contactId
GET    /v1/member/contacts (self-service)
PUT    /v1/member/contacts/:contactId (self-service)
GET    /v1/member-contacts
```

### Identifiers (10 routes)
```
GET    /v1/identifiers/:identifierId
PUT    /v1/identifiers/:identifierId
DELETE /v1/identifiers/:identifierId
POST   /v1/identifiers/:identifierId/validate
GET    /v1/legal-entities/:legalentityid/identifiers
POST   /v1/legal-entities/:legalentityid/identifiers
GET    /v1/entities/:legalentityid/identifiers
POST   /v1/entities/:legalentityid/identifiers
GET    /v1/legal-entities/:legalentityid/verifications
```

### Endpoints (7 routes)
```
GET    /v1/legal-entities/:legalentityid/endpoints
POST   /v1/legal-entities/:legalentityid/endpoints
PUT    /v1/endpoints/:endpointId
DELETE /v1/endpoints/:endpointId
POST   /v1/endpoints/:endpointId/test
PATCH  /v1/endpoints/:endpointId/toggle
GET    /v1/member-endpoints
```

### Registry Integrations (12 routes)
```
# KVK (Dutch Chamber of Commerce)
GET    /v1/legal-entities/:legalentityid/kvk-registry
POST   /v1/legal-entities/:legalentityid/refresh-address-from-kvk
POST   /v1/admin/refresh-all-addresses-from-kvk
POST   /v1/legal-entities/:legalentityid/kvk-document
POST   /v1/legal-entities/:legalentityid/kvk-document/verify
GET    /v1/legal-entities/:legalEntityId/kvk-verification
GET    /v1/kvk-verification/flagged
POST   /v1/kvk-verification/:legalentityid/review

# LEI
GET    /v1/legal-entities/:legalentityid/lei-registry

# German Handelsregister
GET    /v1/legal-entities/:legalentityid/german-registry

# Belgian KBO
GET    /v1/legal-entities/:legalentityid/belgium-registry
```

### EORI (Customs) (3 routes)
```
GET    /v1/legal-entities/:legalentityid/eori-registry
POST   /v1/legal-entities/:legalentityid/eori/fetch
GET    /v1/eori/validate
```

### Peppol (2 routes)
```
GET    /v1/legal-entities/:legalentityid/peppol-registry
POST   /v1/legal-entities/:legalentityid/peppol/fetch
GET    /v1/peppol/search
```

### VIES (VAT) (3 routes)
```
GET    /v1/legal-entities/:legalentityid/vies-registry
POST   /v1/legal-entities/:legalentityid/vies/fetch
GET    /v1/vies/validate
```

### Authentication & Tokens (3 routes)
```
GET    /v1/member/tokens (self-service)
POST   /v1/member/tokens (self-service)
DELETE /v1/member/tokens/:tokenId (self-service)
```

### M2M Clients (5 routes)
```
GET    /v1/legal-entities/:legal_entity_id/m2m-clients
POST   /v1/legal-entities/:legal_entity_id/m2m-clients
POST   /v1/m2m-clients/:m2m_client_id/generate-secret
PATCH  /v1/m2m-clients/:m2m_client_id/scopes
DELETE /v1/m2m-clients/:m2m_client_id
```

### DNS Verification (3 routes)
```
POST   /v1/entities/:legalentityid/dns/token
POST   /v1/dns/verify/:tokenid
GET    /v1/entities/:legalentityid/dns/tokens
```

### Tiers & Authentication Levels (3 routes)
```
GET    /v1/entities/:legalentityid/tier
PUT    /v1/entities/:legalentityid/tier
GET    /v1/tiers/requirements
```

### Branding (2 routes)
```
GET    /v1/legal-entities/:legalentityid/branding
PUT    /v1/legal-entities/:legalentityid/branding
```

### Applications (3 routes)
```
GET    /v1/applications
POST   /v1/applications/:id/approve
POST   /v1/applications/:id/reject
```

### Admin Tasks (3 routes)
```
GET    /v1/tasks
GET    /v1/admin/tasks/list
PUT    /v1/admin/tasks/:taskId
```

### Audit & Logging (3 routes)
```
GET    /v1/audit-logs (appears twice - deduplication needed)
POST   /v1/audit-logs
GET    /v1/authorization-log
```

### System (2 routes)
```
GET    /v1/version
GET    /.well-known/jwks
```

## Recommended Architecture

### Proposed Folder Structure

```
api/src/
├── routes/
│   ├── index.ts                    # Main router aggregator
│   ├── v1/
│   │   ├── index.ts               # v1 API router
│   │   ├── members.routes.ts      # Member/legal entity routes
│   │   ├── contacts.routes.ts     # Contact routes
│   │   ├── identifiers.routes.ts  # Identifier routes
│   │   ├── endpoints.routes.ts    # Endpoint routes
│   │   ├── registries.routes.ts   # Registry integration routes
│   │   ├── eori.routes.ts         # EORI-specific routes
│   │   ├── peppol.routes.ts       # Peppol-specific routes
│   │   ├── vies.routes.ts         # VIES/VAT routes
│   │   ├── tokens.routes.ts       # Member token routes
│   │   ├── m2m.routes.ts          # M2M client routes
│   │   ├── dns.routes.ts          # DNS verification routes
│   │   ├── tiers.routes.ts        # Authentication tier routes
│   │   ├── branding.routes.ts     # Branding routes
│   │   ├── applications.routes.ts # Application approval routes
│   │   ├── tasks.routes.ts        # Admin task routes
│   │   ├── audit.routes.ts        # Audit log routes
│   │   └── system.routes.ts       # System/health routes
│   └── middleware/
│       ├── auth.middleware.ts     # Move requireAuth here
│       └── validators.middleware.ts
├── controllers/
│   ├── members.controller.ts      # Business logic for members
│   ├── contacts.controller.ts
│   ├── identifiers.controller.ts
│   ├── endpoints.controller.ts
│   ├── registries.controller.ts
│   ├── eori.controller.ts
│   ├── peppol.controller.ts
│   ├── vies.controller.ts
│   ├── tokens.controller.ts
│   ├── m2m.controller.ts
│   ├── dns.controller.ts
│   ├── tiers.controller.ts
│   ├── branding.controller.ts
│   ├── applications.controller.ts
│   ├── tasks.controller.ts
│   ├── audit.controller.ts
│   └── system.controller.ts
├── services/                       # Already exists (good!)
│   ├── kvkService.ts
│   ├── leiService.ts
│   ├── eoriService.ts
│   ├── peppolService.ts
│   ├── viesService.ts
│   ├── m2mClientService.ts
│   ├── dnsVerificationService.ts
│   └── ... (other existing services)
├── middleware/                     # Already exists
│   ├── auth.ts                    # JWT validation (existing)
│   ├── rbac.ts                    # RBAC checks (existing)
│   └── cache.ts                   # Caching (existing)
├── utils/                          # Already exists
│   ├── database.ts
│   ├── transaction.ts
│   └── cache.ts
└── validators/                     # Already exists
    └── ... (validation schemas)
```

### Layer Responsibilities

#### 1. Routes Layer (`routes/`)
**Purpose:** HTTP-specific concerns only
- Route path definitions
- HTTP method declarations
- Middleware orchestration
- Request/response shape

**Example:**
```typescript
// routes/v1/members.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as membersController from '../../controllers/members.controller';

const router = Router();

router.get('/members', requireAuth, membersController.listMembers);
router.get('/members/:id', requireAuth, membersController.getMember);
router.post('/members', requireAuth, membersController.createMember);
router.put('/members/:id', requireAuth, membersController.updateMember);
router.delete('/members/:id', requireAuth, membersController.deleteMember);

export default router;
```

#### 2. Controllers Layer (`controllers/`)
**Purpose:** Request/response handling and orchestration
- Extract/validate request data
- Call service layer
- Handle errors
- Format responses
- HTTP status codes

**Example:**
```typescript
// controllers/members.controller.ts
import { Request, Response } from 'express';
import * as membersService from '../services/membersService';
import { ApiError } from '../utils/errors';

export async function listMembers(req: Request, res: Response) {
  try {
    const { page = '1', limit = '50', search, status } = req.query;

    const result = await membersService.listMembers({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      search: search as string,
      status: status as string,
    });

    res.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

export async function getMember(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const member = await membersService.getMemberById(id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
}
```

#### 3. Services Layer (`services/`)
**Purpose:** Business logic and data access (ALREADY EXISTS - GOOD!)
- Database operations
- External API calls
- Business rules
- Data transformations
- Transaction management

**Example (pattern to follow):**
```typescript
// services/membersService.ts
import { getPool } from '../utils/database';
import { withTransaction } from '../utils/transaction';

export interface ListMembersParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export async function listMembers(params: ListMembersParams) {
  const pool = getPool();
  const { page, limit, search, status } = params;

  let query = `
    SELECT legal_entity_id, primary_legal_name, city, country_code,
           kvk, lei, euid, eori, duns, vat, peppol, status
    FROM vw_legal_entities
    WHERE 1=1
  `;
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND primary_legal_name ILIKE $${paramIndex}`;
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  if (status) {
    query += ` AND status = $${paramIndex}`;
    queryParams.push(status);
    paramIndex++;
  }

  query += ` ORDER BY primary_legal_name ASC`;
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  queryParams.push(limit, (page - 1) * limit);

  const { rows } = await pool.query(query, queryParams);

  // Get total count
  const countQuery = buildCountQuery(search, status);
  const { rows: countRows } = await pool.query(countQuery.sql, countQuery.params);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: parseInt(countRows[0].count),
      totalPages: Math.ceil(parseInt(countRows[0].count) / limit),
    },
  };
}

export async function getMemberById(id: string) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM vw_legal_entities WHERE legal_entity_id = $1',
    [id]
  );
  return rows[0] || null;
}
```

## Migration Strategy

### Phase 1: Foundation (Minimal Risk)
**Goal:** Set up structure without breaking existing code

1. **Create new directories**
   ```bash
   mkdir -p api/src/routes/v1
   mkdir -p api/src/routes/middleware
   mkdir -p api/src/controllers
   ```

2. **Extract shared middleware**
   - Move `requireAuth` from routes.ts to `routes/middleware/auth.middleware.ts`
   - Keep existing `middleware/auth.ts` (JWT validation) untouched

3. **Create route aggregator**
   - Create `routes/index.ts` (imports all v1 routes)
   - Create `routes/v1/index.ts` (aggregates v1 routes)

4. **Update server.ts**
   ```typescript
   // Old:
   import { router } from './routes';
   app.use('/api', router);

   // New:
   import routes from './routes';
   app.use('/api', routes);
   ```

### Phase 2: Extract System Routes (Low Risk)
**Start with simplest routes to validate pattern**

1. **Create `routes/v1/system.routes.ts`**
   - `/v1/version`
   - `/.well-known/jwks`

2. **Create `controllers/system.controller.ts`**
   - Extract inline logic from routes.ts

3. **Test and verify**

### Phase 3: Extract High-Value Domains (Medium Risk)
**Target domains with clear service boundaries**

Priority order:
1. **EORI routes** → `routes/v1/eori.routes.ts` + `controllers/eori.controller.ts`
   - Already has `eoriService.ts`
   - Self-contained domain

2. **Peppol routes** → `routes/v1/peppol.routes.ts` + `controllers/peppol.controller.ts`
   - Already has `peppolService.ts`
   - Self-contained domain

3. **VIES routes** → `routes/v1/vies.routes.ts` + `controllers/vies.controller.ts`
   - Already has `viesService.ts`
   - Self-contained domain

4. **DNS verification** → `routes/v1/dns.routes.ts` + `controllers/dns.controller.ts`
   - Already has `dnsVerificationService.ts`

5. **M2M clients** → `routes/v1/m2m.routes.ts` + `controllers/m2m.controller.ts`
   - Already has `m2mClientService.ts`

### Phase 4: Extract Complex Domains (Higher Risk)
**Domains with more interdependencies**

1. **Registries** (KVK, LEI, German, Belgian)
2. **Identifiers**
3. **Contacts**
4. **Endpoints**
5. **Branding**
6. **Tiers**

### Phase 5: Extract Core Domains (Highest Risk)
**Most critical and interconnected**

1. **Members/Legal Entities**
2. **Applications**
3. **Tasks**
4. **Audit Logs**
5. **Tokens**

### Phase 6: Cleanup
1. Delete original `routes.ts`
2. Update all imports
3. Update documentation
4. Celebrate!

## Best Practices for Implementation

### 1. Controller Pattern Guidelines

**DO:**
```typescript
// ✓ Thin controllers - delegate to services
export async function createMember(req: Request, res: Response) {
  try {
    const member = await membersService.createMember(req.body);
    res.status(201).json(member);
  } catch (error) {
    handleError(error, res);
  }
}
```

**DON'T:**
```typescript
// ✗ Fat controllers - business logic in controller
export async function createMember(req: Request, res: Response) {
  const pool = getPool();
  const { name, kvk } = req.body;

  // Validation
  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Invalid name' });
  }

  // Business logic
  const existingMember = await pool.query('SELECT * FROM legal_entity WHERE kvk = $1', [kvk]);
  if (existingMember.rows.length > 0) {
    return res.status(409).json({ error: 'Member already exists' });
  }

  // Database operations
  const result = await pool.query(
    'INSERT INTO legal_entity (primary_legal_name, kvk) VALUES ($1, $2) RETURNING *',
    [name, kvk]
  );

  res.status(201).json(result.rows[0]);
}
```

### 2. Naming Conventions

**Routes:**
- `members.routes.ts` - Plural, descriptive
- Use Express Router
- Export as `export default router;`

**Controllers:**
- `members.controller.ts` - Plural, descriptive
- Export named functions: `export async function listMembers(...)`
- Function names: verb + noun (e.g., `createMember`, `listMembers`, `deleteMember`)

**Services:**
- Already established: `membersService.ts`
- Export named functions
- Function names describe business action

### 3. Error Handling Pattern

**Centralized error handler:**
```typescript
// utils/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// controllers/helpers.ts
export function handleError(error: unknown, res: Response) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
  }

  console.error('Unexpected error:', error);
  res.status(500).json({ error: 'Internal server error' });
}
```

### 4. Avoid Code Duplication

**Extract common patterns:**
```typescript
// controllers/helpers.ts
export async function withPagination<T>(
  req: Request,
  res: Response,
  serviceFn: (params: any) => Promise<{ data: T[]; total: number }>
) {
  try {
    const { page = '1', limit = '50', ...filters } = req.query;

    const result = await serviceFn({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      ...filters,
    });

    res.json({
      data: result.data,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    handleError(error, res);
  }
}

// Usage in controller:
export const listMembers = (req: Request, res: Response) =>
  withPagination(req, res, membersService.listMembers);
```

### 5. Testing Strategy

**Unit Tests (Controllers):**
```typescript
// controllers/__tests__/members.controller.test.ts
import { Request, Response } from 'express';
import * as membersController from '../members.controller';
import * as membersService from '../../services/membersService';

jest.mock('../../services/membersService');

describe('Members Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { query: {}, params: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it('should list members with pagination', async () => {
    const mockData = { data: [], pagination: { page: 1, limit: 50, total: 0 } };
    (membersService.listMembers as jest.Mock).mockResolvedValue(mockData);

    await membersController.listMembers(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(mockData);
  });
});
```

**Integration Tests (Routes):**
```typescript
// routes/__tests__/members.routes.test.ts
import request from 'supertest';
import express from 'express';
import membersRoutes from '../v1/members.routes';

const app = express();
app.use('/api/v1', membersRoutes);

describe('Members Routes', () => {
  it('GET /members should return 200', async () => {
    const response = await request(app)
      .get('/api/v1/members')
      .set('Authorization', 'Bearer mock-token');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
  });
});
```

### 6. Route Organization Best Practices

**RESTful Principles:**
- Use standard HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- Use resource-based URLs (`/members/:id` not `/getMember/:id`)
- Use sub-resources for relationships (`/members/:id/contacts`)

**Middleware Ordering:**
```typescript
router.get(
  '/members/:id',
  requireAuth,           // 1. Authentication
  validateParams,        // 2. Validation
  checkPermissions,      // 3. Authorization
  cacheMiddleware,       // 4. Caching
  controller.getMember   // 5. Business logic
);
```

**Avoid Deep Nesting:**
```typescript
// ✓ Good (max 2 levels)
/members/:id/contacts
/members/:id/identifiers

// ✗ Bad (too deep)
/members/:id/contacts/:contactId/addresses/:addressId
```

## Code Duplication Analysis

**Current patterns repeated across routes.ts:**

1. **Pagination logic** - ~15 instances
2. **Error handling** - ~87 instances (every route)
3. **Auth header parsing** - Centralized in `requireAuth` (good!)
4. **Database query patterns** - ~60+ instances
5. **Request validation** - Inline in each route

**Opportunities for DRY:**
- Create `withPagination` helper
- Create `handleError` helper
- Create request validators
- Extract query builders to services

## File Size Guidelines

**Target file sizes:**
- Route files: 50-200 lines
- Controller files: 100-400 lines
- Service files: 200-600 lines (some complexity is OK here)

**Red flags:**
- Any file > 1000 lines needs refactoring
- Routes > 300 lines likely has embedded business logic
- Controllers > 500 lines likely doing too much

## Migration Checklist Template

For each domain migration:
- [ ] Create route file in `routes/v1/`
- [ ] Create controller file in `controllers/`
- [ ] Extract service logic (if not already in `services/`)
- [ ] Add route to `routes/v1/index.ts`
- [ ] Write unit tests for controller
- [ ] Write integration tests for routes
- [ ] Update OpenAPI spec (`openapi.json`)
- [ ] Test in local environment
- [ ] Deploy to dev environment
- [ ] Verify in production
- [ ] Remove old code from `routes.ts`
- [ ] Update documentation

## Success Metrics

**Before:**
- 1 file with 5,513 lines
- 87 routes in single file
- Business logic embedded in routes
- Hard to test
- Merge conflict risk: HIGH

**After:**
- 15-20 route files (~100-200 lines each)
- 15-20 controller files (~200-400 lines each)
- Business logic in services (already mostly done!)
- Easy to test each layer independently
- Merge conflict risk: LOW

## Timeline Estimate

**Conservative estimate:**
- Phase 1 (Foundation): 2-4 hours
- Phase 2 (System routes): 1-2 hours
- Phase 3 (High-value domains): 8-12 hours (5 domains × 1.5-2.5 hours)
- Phase 4 (Complex domains): 12-18 hours (6 domains × 2-3 hours)
- Phase 5 (Core domains): 10-15 hours (5 domains × 2-3 hours)
- Phase 6 (Cleanup): 2-4 hours
- Testing & Documentation: 6-10 hours

**Total:** 41-65 hours (1-1.5 weeks of focused work)

**Aggressive estimate (if done incrementally):**
- 1-2 domains per day
- Complete refactoring in 2-3 weeks

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing API | HIGH | Incremental migration, keep both old and new routes during transition |
| Test coverage gaps | MEDIUM | Write tests during migration, not after |
| Performance regression | MEDIUM | Add performance monitoring, compare before/after metrics |
| Developer confusion | LOW | Clear documentation, pair programming during transition |
| Merge conflicts during migration | MEDIUM | Communicate migration schedule, avoid concurrent work on routes.ts |

## Next Steps

1. **Review this plan** with team
2. **Get approval** for migration approach
3. **Start with Phase 1** (foundation setup)
4. **Pick one simple domain** (system routes) to validate pattern
5. **Iterate** on remaining domains
6. **Celebrate** when routes.ts is deleted!

## References

- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

**Document Version:** 1.0
**Created:** 2025-12-17
**Author:** Architecture Review
**Status:** PROPOSED - Awaiting approval
