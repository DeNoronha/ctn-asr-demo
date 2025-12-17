# Routes Refactoring - Architecture Diagram

## Current Architecture (BEFORE)

```
┌─────────────────────────────────────────────────────────────┐
│                        routes.ts                            │
│                     (5,513 lines)                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Route Definitions (87 routes)                       │  │
│  │  + Authentication Logic                              │  │
│  │  + Request Validation                                │  │
│  │  + Business Logic                                    │  │
│  │  + Database Queries                                  │  │
│  │  + Error Handling                                    │  │
│  │  + Response Formatting                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Problems:                                                  │
│  ✗ Single Responsibility Principle violated               │
│  ✗ Hard to test                                           │
│  ✗ Hard to maintain                                       │
│  ✗ Merge conflicts                                        │
│  ✗ Poor discoverability                                  │
└─────────────────────────────────────────────────────────────┘
```

## Proposed Architecture (AFTER)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HTTP Request                                   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROUTES LAYER (HTTP)                                 │
│                    (15-20 files, ~100-200 lines each)                       │
│                                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │ members.routes │  │ contacts.routes│  │ identifiers... │               │
│  │                │  │                │  │                │               │
│  │ GET /members   │  │ GET /contacts  │  │ GET /identifiers               │
│  │ POST /members  │  │ POST /contacts │  │ POST /identifiers              │
│  │ PUT /members/…│  │ PUT /contacts/…│  │ PUT /identifiers/…            │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘               │
│           │                   │                    │                        │
│  Responsibilities:            │                    │                        │
│  • Route path definitions     │                    │                        │
│  • HTTP method declarations   │                    │                        │
│  • Middleware orchestration   │                    │                        │
└───────────┼───────────────────┼────────────────────┼────────────────────────┘
            │                   │                    │
            ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MIDDLEWARE LAYER                                      │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ requireAuth  │  │  validateReq │  │    RBAC      │  │    Cache     │  │
│  │              │  │              │  │              │  │              │  │
│  │ • JWT check  │  │ • Schema val │  │ • Permission │  │ • Get cached │  │
│  │ • Extract ID │  │ • Sanitize   │  │   checks     │  │ • Store data │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────────────┼──────────┘
          │                 │                  │                  │
          └─────────────────┴──────────────────┴──────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CONTROLLERS LAYER (ORCHESTRATION)                      │
│                    (15-20 files, ~200-400 lines each)                       │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ members.ctrl     │  │ contacts.ctrl    │  │ identifiers.ctrl │         │
│  │                  │  │                  │  │                  │         │
│  │ listMembers()    │  │ listContacts()   │  │ listIdentifiers()│         │
│  │ getMember()      │  │ getContact()     │  │ getIdentifier()  │         │
│  │ createMember()   │  │ createContact()  │  │ createIdentifier()         │
│  │ updateMember()   │  │ updateContact()  │  │ updateIdentifier()         │
│  │ deleteMember()   │  │ deleteContact()  │  │ deleteIdentifier()         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                      │                    │
│  Responsibilities:              │                      │                    │
│  • Extract request data         │                      │                    │
│  • Validate input               │                      │                    │
│  • Call service layer           │                      │                    │
│  • Handle errors                │                      │                    │
│  • Format HTTP response         │                      │                    │
│  • Set status codes             │                      │                    │
└───────────┼─────────────────────┼──────────────────────┼────────────────────┘
            │                     │                      │
            ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SERVICES LAYER (BUSINESS LOGIC)                        │
│                      (Already exists - GOOD!)                               │
│                    (20+ files, ~200-600 lines each)                         │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ membersService   │  │ contactsService  │  │ identifiersService         │
│  │                  │  │                  │  │                  │         │
│  │ listMembers()    │  │ listContacts()   │  │ listIdentifiers()│         │
│  │ getMemberById()  │  │ getContactById() │  │ getIdentifierById()        │
│  │ createMember()   │  │ createContact()  │  │ createIdentifier()         │
│  │ updateMember()   │  │ updateContact()  │  │ validateIdentifier()       │
│  │ deleteMember()   │  │ deleteContact()  │  │ enrichIdentifier()         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                      │                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ kvkService       │  │ leiService       │  │ eoriService      │         │
│  │ peppolService    │  │ viesService      │  │ m2mClientService │         │
│  │ dnsVerification  │  │ tierService      │  │ taskService      │         │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘         │
│           │                     │                      │                    │
│  Responsibilities:              │                      │                    │
│  • Business logic               │                      │                    │
│  • Data validation              │                      │                    │
│  • Database operations          │                      │                    │
│  • External API calls           │                      │                    │
│  • Transaction management       │                      │                    │
│  • Data transformation          │                      │                    │
└───────────┼─────────────────────┼──────────────────────┼────────────────────┘
            │                     │                      │
            ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA ACCESS LAYER                                   │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ PostgreSQL       │  │ External APIs    │  │ Cache (Redis)    │         │
│  │                  │  │                  │  │                  │         │
│  │ • legal_entity   │  │ • KVK Registry   │  │ • Member data    │         │
│  │ • contacts       │  │ • LEI Registry   │  │ • Registry data  │         │
│  │ • identifiers    │  │ • German HRB     │  │ • API responses  │         │
│  │ • endpoints      │  │ • Belgian KBO    │  │                  │         │
│  │ • m2m_clients    │  │ • Peppol         │  │                  │         │
│  │ • audit_log      │  │ • VIES (VAT)     │  │                  │         │
│  │ • applications   │  │ • EORI (Customs) │  │                  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Request Flow Example

```
GET /api/v1/members?page=1&limit=50&search=Acme

1. Routes Layer (members.routes.ts)
   ↓
   router.get('/members', requireAuth, cacheMiddleware, membersController.listMembers)

2. Middleware Layer
   ↓
   requireAuth → Validates JWT token, extracts user info
   ↓
   cacheMiddleware → Checks if cached response exists
   ↓
   (no cache, continue)

3. Controller Layer (members.controller.ts)
   ↓
   export async function listMembers(req, res) {
     const { page, limit, search } = req.query;
     ↓
     Call service layer with validated parameters
     ↓
     const result = await membersService.listMembers({ page, limit, search });
     ↓
     Format and return HTTP response
     ↓
     res.json(result);
   }

4. Service Layer (membersService.ts)
   ↓
   export async function listMembers(params) {
     ↓
     Build SQL query with parameters
     ↓
     Execute database query
     ↓
     Transform data to match API contract
     ↓
     Return { data, pagination }
   }

5. Database Layer
   ↓
   Execute SQL: SELECT * FROM vw_legal_entities WHERE primary_legal_name ILIKE '%Acme%'
   ↓
   Return rows

6. Response Flow (back up the chain)
   Service → Controller → Middleware → Routes → Client
```

## File Size Comparison

### Before Refactoring
```
routes.ts: ████████████████████████████████████████████████ 5,513 lines
```

### After Refactoring (Target)
```
routes/v1/members.routes.ts:      ████ 150 lines
routes/v1/contacts.routes.ts:     ███ 120 lines
routes/v1/identifiers.routes.ts:  ███ 130 lines
routes/v1/endpoints.routes.ts:    ██ 90 lines
routes/v1/registries.routes.ts:   █████ 200 lines
routes/v1/eori.routes.ts:         ██ 80 lines
routes/v1/peppol.routes.ts:       ██ 70 lines
routes/v1/vies.routes.ts:         ██ 70 lines
routes/v1/tokens.routes.ts:       ██ 80 lines
routes/v1/m2m.routes.ts:          ███ 100 lines
routes/v1/dns.routes.ts:          ██ 80 lines
routes/v1/tiers.routes.ts:        ██ 70 lines
routes/v1/branding.routes.ts:     ██ 60 lines
routes/v1/applications.routes.ts: ██ 80 lines
routes/v1/tasks.routes.ts:        ██ 80 lines
routes/v1/audit.routes.ts:        ██ 80 lines
routes/v1/system.routes.ts:       █ 50 lines
routes/v1/index.ts:               █ 40 lines
routes/index.ts:                  █ 30 lines

Total: 1,660 lines (routes only, controllers add ~3,000 more lines)
```

## Benefits of Layered Architecture

### 1. Separation of Concerns
```
┌─────────────────┐
│ HTTP Concerns   │ → Routes Layer
│ • Paths         │
│ • Methods       │
│ • Middleware    │
└─────────────────┘

┌─────────────────┐
│ Request/Response│ → Controllers Layer
│ • Parsing       │
│ • Validation    │
│ • Formatting    │
│ • Error handling│
└─────────────────┘

┌─────────────────┐
│ Business Logic  │ → Services Layer
│ • Data access   │
│ • External APIs │
│ • Transactions  │
│ • Rules         │
└─────────────────┘
```

### 2. Testability
```
Unit Tests:
  Controllers ──> Mock Services
  Services ───> Mock Database/APIs

Integration Tests:
  Routes ──────> Real Controllers + Mock Services

E2E Tests:
  Full Stack ──> Real Database + Real Services
```

### 3. Reusability
```
Same service, multiple consumers:

membersService.getMemberById()
       ↑             ↑           ↑
       │             │           │
  /members/:id  /applications  Admin Portal
```

### 4. Maintainability
```
Change request: "Add email validation to member creation"

Before (routes.ts):
  Find route in 5,513 line file ✗
  Inline logic mixed with HTTP ✗
  Hard to locate validation ✗

After (layered):
  1. routes/v1/members.routes.ts (unchanged) ✓
  2. controllers/members.controller.ts (unchanged) ✓
  3. services/membersService.ts (add validation) ✓
  4. validators/memberSchemas.ts (add email rule) ✓
```

## Migration Path Visualization

```
Phase 1: Foundation
┌─────────────┐
│  routes.ts  │  (5,513 lines - UNCHANGED)
└─────────────┘
      +
┌─────────────┐
│ Create dirs │  routes/, controllers/
└─────────────┘
      +
┌─────────────┐
│ Move helpers│  requireAuth → middleware/
└─────────────┘

Phase 2: System Routes (validate pattern)
┌─────────────┐     ┌─────────────┐
│  routes.ts  │ ──→ │ system.     │ (50 lines)
│ (5,463 lines)    │ routes.ts   │
└─────────────┘     └─────────────┘
                    ┌─────────────┐
                    │ system.     │ (100 lines)
                    │ controller  │
                    └─────────────┘

Phase 3-5: Domain-by-Domain Migration
┌─────────────┐     ┌─────────────┐
│  routes.ts  │ ──→ │ 15-20 route │
│ (shrinking) │     │ files       │
└─────────────┘     └─────────────┘
                    ┌─────────────┐
                    │ 15-20 ctrl  │
                    │ files       │
                    └─────────────┘

Phase 6: Complete
┌─────────────┐
│  routes.ts  │  DELETED ✓
└─────────────┘
      +
┌─────────────┐
│ Clean arch  │  ✓ Testable
│             │  ✓ Maintainable
│             │  ✓ Scalable
└─────────────┘
```

## Directory Structure Before vs After

### BEFORE
```
api/src/
├── server.ts
├── routes.ts ← 5,513 lines, 87 routes
├── services/
│   ├── kvkService.ts
│   ├── leiService.ts
│   └── ... (20+ services)
├── middleware/
│   ├── auth.ts
│   └── rbac.ts
└── utils/
    └── database.ts
```

### AFTER
```
api/src/
├── server.ts
├── routes/
│   ├── index.ts ← Aggregates all routes
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── v1/
│       ├── index.ts ← Aggregates v1 routes
│       ├── members.routes.ts (150 lines)
│       ├── contacts.routes.ts (120 lines)
│       ├── identifiers.routes.ts (130 lines)
│       ├── endpoints.routes.ts (90 lines)
│       ├── registries.routes.ts (200 lines)
│       ├── eori.routes.ts (80 lines)
│       ├── peppol.routes.ts (70 lines)
│       ├── vies.routes.ts (70 lines)
│       ├── tokens.routes.ts (80 lines)
│       ├── m2m.routes.ts (100 lines)
│       ├── dns.routes.ts (80 lines)
│       ├── tiers.routes.ts (70 lines)
│       ├── branding.routes.ts (60 lines)
│       ├── applications.routes.ts (80 lines)
│       ├── tasks.routes.ts (80 lines)
│       ├── audit.routes.ts (80 lines)
│       └── system.routes.ts (50 lines)
├── controllers/
│   ├── members.controller.ts (300 lines)
│   ├── contacts.controller.ts (250 lines)
│   ├── identifiers.controller.ts (280 lines)
│   ├── endpoints.controller.ts (200 lines)
│   ├── registries.controller.ts (400 lines)
│   ├── eori.controller.ts (180 lines)
│   ├── peppol.controller.ts (160 lines)
│   ├── vies.controller.ts (160 lines)
│   ├── tokens.controller.ts (180 lines)
│   ├── m2m.controller.ts (220 lines)
│   ├── dns.controller.ts (180 lines)
│   ├── tiers.controller.ts (160 lines)
│   ├── branding.controller.ts (140 lines)
│   ├── applications.controller.ts (200 lines)
│   ├── tasks.controller.ts (200 lines)
│   ├── audit.controller.ts (180 lines)
│   └── system.controller.ts (100 lines)
├── services/ ← Already exists (GOOD!)
│   ├── membersService.ts (NEW, extracts from routes.ts)
│   ├── contactsService.ts (NEW)
│   ├── identifiersService.ts (NEW)
│   ├── kvkService.ts (existing)
│   ├── leiService.ts (existing)
│   ├── eoriService.ts (existing)
│   ├── peppolService.ts (existing)
│   ├── viesService.ts (existing)
│   ├── m2mClientService.ts (existing)
│   ├── dnsVerificationService.ts (existing)
│   └── ... (20+ services)
├── middleware/ ← Keep existing
│   ├── auth.ts
│   ├── rbac.ts
│   └── cache.ts
└── utils/ ← Keep existing
    ├── database.ts
    └── transaction.ts
```

## Key Principles Applied

### 1. Single Responsibility Principle (SRP)
```
BEFORE:
routes.ts → Routing + Validation + Business Logic + Data Access ✗

AFTER:
routes/    → Routing only ✓
controllers/ → Request/Response handling ✓
services/  → Business Logic + Data Access ✓
```

### 2. Open/Closed Principle
```
Adding new endpoint:

BEFORE:
Edit 5,513 line file, risk breaking other routes ✗

AFTER:
Create new route file, zero impact on existing routes ✓
```

### 3. Dependency Inversion
```
BEFORE:
Routes ──> Direct database calls ✗

AFTER:
Routes ──> Controllers ──> Services ──> Database ✓
         (depends on abstractions)
```

### 4. Don't Repeat Yourself (DRY)
```
BEFORE:
Pagination logic repeated 15 times ✗

AFTER:
withPagination() helper used everywhere ✓
```

## Success Criteria

1. ✓ No file > 1,000 lines
2. ✓ Routes files: 50-200 lines
3. ✓ Controller files: 100-400 lines
4. ✓ Service files: 200-600 lines
5. ✓ 100% test coverage for controllers
6. ✓ No code duplication
7. ✓ All routes documented in OpenAPI spec
8. ✓ Zero breaking changes to API consumers

---

**Document Version:** 1.0
**Created:** 2025-12-17
**Purpose:** Visual guide for routes.ts refactoring
