# Code Quality Review - Building Maintainable Software Principles

**Date:** November 13, 2025
**Reviewer:** Code Reviewer Agent
**Framework:** Joost Visser's 10 Principles for Building Maintainable Software
**Codebase:** CTN ASR Monorepo (API + Admin Portal + Member Portal)

---

## Executive Summary

**Overall Health Score:** 5.5/10

**Key Statistics:**
- Total API functions: 67
- Total React components analyzed: 30+
- Files exceeding 100 lines: 20+ API functions, 30+ React components
- Largest file: `endpointWrapper.ts` (531 lines), `MemberDetailView.tsx` (589 lines)
- Largest function files: `ManageM2MClients.ts` (935 lines), `EndpointRegistrationWorkflow.ts` (825 lines)

**Critical Issues:** 8
**High Priority Issues:** 15
**Medium Priority Issues:** 23

**Overall Assessment:**
The codebase demonstrates solid architectural foundations with good security practices (JWT authentication, RBAC, CSRF protection, rate limiting). However, it suffers from significant maintainability issues including:
- Excessive file lengths violating the 100-line guideline
- Complex middleware functions with high cyclomatic complexity
- Substantial code duplication across database queries and error handling
- Large React components mixing multiple concerns
- Inconsistent parameter counts and interface designs

The recent `ManageEndpoints.ts` file shows good practices (small, focused handlers), suggesting awareness of quality principles but inconsistent application across the codebase.

---

## Principle 1: Write Short Units of Code
**Guideline:** Limit method/function length to 15 lines (excluding blank lines and comments)
**Status:** ❌ MAJOR VIOLATIONS

### Violations Found

#### Critical Violations (>100 lines per function)

1. **File:** `/api/src/middleware/endpointWrapper.ts:138-477`
   - **Function:** `wrapEndpoint()`
   - **Current length:** ~339 lines
   - **Cyclomatic complexity:** ~20+ branch points
   - **Impact:** This is the central middleware used by ALL API endpoints. Its complexity makes it difficult to modify, test, and debug.
   - **Solution:** Break into smaller functions:
     ```typescript
     // Proposed refactoring
     function wrapEndpoint(handler, options) {
       return async (request, context) => {
         const requestId = initializeRequest(request);

         if (await shouldHandleCors(request, options)) {
           return handleCorsPreflightResponse(request, options, requestId);
         }

         const securityResult = await enforceSecurityChecks(request, context, options);
         if (!securityResult.allowed) return securityResult.response;

         const authResult = await authenticateRequest(request, context, options);
         if (!authResult.success) return authResult.response;

         const authzResult = await authorizeRequest(authResult.request, context, options);
         if (!authzResult.authorized) return authzResult.response;

         return await executeHandler(handler, authResult.request, context, options);
       };
     }
     ```

2. **File:** `/api/src/functions/generateBvad.ts:22-301`
   - **Function:** `handler()`
   - **Current length:** ~280 lines
   - **Issues:**
     - Mixes validation, database queries, business logic, audit logging
     - Complex conditional logic for member lookup
     - Registry identifier processing embedded in main flow
   - **Solution:** Extract helper functions:
     ```typescript
     async function findMember(criteria: FindMemberCriteria): Promise<Member>
     async function fetchRegistryIdentifiers(legalEntityId: string): Promise<RegistryIdentifier[]>
     async function validateMemberEligibility(member: Member): Promise<ValidationResult>
     async function buildBvadClaims(member: Member, identifiers: RegistryIdentifier[]): Promise<BvadClaims>
     async function auditBvadIssuance(token: BvadToken, member: Member): Promise<void>
     ```

3. **File:** `/api/src/middleware/auth.ts:300-485`
   - **Function:** `authenticate()`
   - **Current length:** ~185 lines
   - **Issues:**
     - Multiple header extraction attempts
     - Token validation
     - Party resolution
     - Extensive error handling for each step
   - **Solution:** Extract validation stages:
     ```typescript
     async function extractBearerToken(request: HttpRequest): Promise<Result<string>>
     async function validateToken(token: string, context: InvocationContext): Promise<JwtPayload>
     async function resolveUserContext(payload: JwtPayload, context: InvocationContext): Promise<UserContext>
     function buildAuthenticatedRequest(request: HttpRequest, userContext: UserContext): AuthenticatedRequest
     ```

#### High Priority Violations (50-100 lines)

4. **File:** `/admin-portal/src/components/MemberDetailView.tsx`
   - **Function:** Component main body (589 lines total)
   - **Current length:** 589 lines
   - **Issues:**
     - Manages 8 different tabs
     - 10+ state variables
     - 15+ handler functions
     - Mixes data fetching, state management, and rendering
   - **Solution:** Split into sub-components:
     ```typescript
     // Extract each tab into its own component
     <CompanyDetailsTab member={member} legalEntity={legalEntity} />
     <IdentifiersTab legalEntityId={member.legal_entity_id} />
     <SystemIntegrationsTab legalEntityId={member.legal_entity_id} />
     <ContactsTab legalEntity={legalEntity} />
     // etc.
     ```

5. **File:** `/api/src/functions/GetAuthenticatedMember.ts:5-131`
   - **Function:** `handler()`
   - **Current length:** ~127 lines
   - **Issues:**
     - Two separate database queries with fallback logic
     - Conditional identifier fetching
     - Multiple error paths
   - **Solution:**
     ```typescript
     async function findMemberByEmail(email: string): Promise<Member | null>
     async function findMemberByDomain(domain: string): Promise<Member | null>
     async function enrichWithIdentifiers(member: Member): Promise<Member>
     ```

### Recommendations

**Quick Wins:**
1. Extract all database queries into separate query functions
2. Move validation logic into validator functions
3. Create dedicated error response builders

**Refactoring Priorities:**
1. **HIGH:** Refactor `endpointWrapper.ts` - affects entire API surface
2. **HIGH:** Split `MemberDetailView.tsx` into tab components
3. **MEDIUM:** Extract `generateBvad` business logic
4. **MEDIUM:** Simplify `authenticate()` middleware

---

## Principle 2: Write Simple Units of Code
**Guideline:** Limit cyclomatic complexity to 5 branch points per method
**Status:** ❌ MAJOR VIOLATIONS

### Violations Found

#### Critical Complexity Issues

1. **File:** `/api/src/middleware/endpointWrapper.ts:138-477`
   - **Function:** `wrapEndpoint()`
   - **Branch points:** 20+ (estimated)
   - **Branches:**
     - OPTIONS method check
     - HTTPS enforcement check
     - Rate limit enabled check
     - Rate limit exceeded check
     - Content-type validation check
     - Authentication required check
     - Authentication success check
     - Role check required
     - Role check passed
     - Permission check required
     - Permission check passed
     - CSRF token validation (state-changing methods)
     - CORS enabled checks (repeated multiple times)
   - **Impact:** Extremely difficult to test all code paths
   - **Solution:** Use chain of responsibility pattern or middleware pipeline

2. **File:** `/api/src/functions/generateBvad.ts:22-301`
   - **Function:** `handler()`
   - **Branch points:** 15+ (estimated)
   - **Branches:**
     - Input validation (memberDomain vs kvk vs lei)
     - Member query construction (3 paths)
     - Member not found check
     - Legal entity ID check
     - Registry query check
     - Identifier type checks (EUID special handling)
     - Status validation (ACTIVE vs APPROVED)
     - KvK verification status checks
     - Admin contact existence check
   - **Recommended complexity:** 5 or less per function
   - **Solution:** Extract decision logic into separate functions with clear responsibilities

3. **File:** `/admin-portal/src/components/MemberDetailView.tsx:52-100`
   - **Function:** `loadData()` useEffect callback
   - **Branch points:** 10+
   - **Branches:**
     - legal_entity_id existence check
     - Entity load try/catch
     - Contacts load try/catch
     - Identifiers load try/catch
     - Endpoints load try/catch + nested 404 check
     - KvK registry data load try/catch + 404 special handling
   - **Solution:** Use separate data fetching hooks or extract to custom hook

### Code Complexity Metrics

**Functions with Complexity > 10:**
- `wrapEndpoint()`: ~20
- `authenticate()`: ~15
- `generateBvad handler()`: ~15
- `AllEndpointsView.loadAllEndpoints()`: ~12
- `MemberDetailView.loadData()`: ~10

**Functions with Complexity 6-10:**
- `getEndpointsByEntityHandler()`: ~7
- `createEndpointHandler()`: ~8
- `handleCreateEndpoint()` (EndpointManagement): ~8
- `validateJwtToken()`: ~8

### Recommendations

1. **Implement Guard Clauses:** Return early on validation failures instead of deep nesting
   ```typescript
   // BEFORE (nested)
   if (authHeader) {
     if (authHeader.startsWith('Bearer ')) {
       const token = authHeader.substring(7);
       if (token) {
         // actual logic
       }
     }
   }

   // AFTER (guard clauses)
   if (!authHeader) return unauthorized('Missing auth header');
   if (!authHeader.startsWith('Bearer ')) return unauthorized('Invalid scheme');
   const token = authHeader.substring(7);
   if (!token) return unauthorized('Empty token');
   // actual logic
   ```

2. **Use Strategy Pattern:** For complex conditional logic
   ```typescript
   const memberLookupStrategies = {
     byDomain: (params) => lookupByDomain(params.domain),
     byKvk: (params) => lookupByKvk(params.kvk),
     byLei: (params) => lookupByLei(params.lei)
   };

   const strategy = params.domain ? 'byDomain' : params.kvk ? 'byKvk' : 'byLei';
   const member = await memberLookupStrategies[strategy](params);
   ```

3. **Extract Validation:** Move validation to separate pure functions
   ```typescript
   function validateBvadRequest(body: unknown): ValidationResult<GenerateBvadRequest> {
     // All validation logic here
   }
   ```

---

## Principle 3: Write Code Once (DRY)
**Guideline:** No code duplication - maximum 6 lines of duplicate code
**Status:** ❌ SIGNIFICANT VIOLATIONS

### Violations Found

#### Database Query Duplication

1. **Pattern:** `const pool = getPool()` appears **63 times** across API functions
   - **Files affected:** Nearly all API functions
   - **Solution:** Inject pool via middleware or use dependency injection
   ```typescript
   // Option 1: Add to AuthenticatedRequest
   interface AuthenticatedRequest {
     db: Pool; // Injected by middleware
   }

   // Option 2: Higher-order function
   function withDatabase<T>(handler: (req: AuthenticatedRequest, pool: Pool) => Promise<T>) {
     return async (req: AuthenticatedRequest) => {
       const pool = getPool();
       return handler(req, pool);
     };
   }
   ```

2. **Pattern:** Duplicate SQL queries for legal entity lookup
   - **Occurrences:** 15+ files
   - **Example:**
   ```sql
   SELECT legal_entity_id FROM legal_entity
   WHERE legal_entity_id = $1 AND is_deleted = false
   ```
   - **Files:** `ManageEndpoints.ts`, `CreateIdentifier.ts`, `UpdateIdentifier.ts`, `CreateContact.ts`, etc.
   - **Solution:** Create query repository
   ```typescript
   // api/src/repositories/legalEntityRepository.ts
   export class LegalEntityRepository {
     static async exists(pool: Pool, legalEntityId: string): Promise<boolean> {
       const result = await pool.query(
         'SELECT EXISTS(SELECT 1 FROM legal_entity WHERE legal_entity_id = $1 AND is_deleted = false)',
         [legalEntityId]
       );
       return result.rows[0].exists;
     }

     static async findById(pool: Pool, legalEntityId: string): Promise<LegalEntity | null> {
       // Standard query
     }
   }
   ```

3. **Pattern:** Error handling duplication
   - **Occurrences:** 113 try-catch blocks across API functions
   - **Duplicate code:**
   ```typescript
   } catch (error) {
     context.error('Error [action]:', error);
     return {
       status: 500,
       jsonBody: { error: 'Failed to [action]' }
     };
   }
   ```
   - **Solution:** Standardized error handler (already exists but not used consistently)
   ```typescript
   import { handleError } from '../utils/errors';

   try {
     // logic
   } catch (error) {
     return handleError(error, context, requestId);
   }
   ```

#### Frontend Duplication

4. **Pattern:** MSAL token acquisition code duplicated
   - **Files:** `EndpointManagement.tsx`, `APIAccessManager.tsx`, `M2MClientsManager.tsx`
   - **Duplicate code (20+ lines):**
   ```typescript
   const getAccessToken = async (): Promise<string> => {
     const accounts = (window as any).msalInstance?.getAllAccounts();
     if (!accounts || accounts.length === 0) {
       throw new Error('No authenticated user');
     }
     const request = {
       scopes: ['api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user'],
       account: accounts[0],
     };
     const response = await (window as any).msalInstance.acquireTokenSilent(request);
     return response.accessToken;
   };
   ```
   - **Solution:** Already have `@ctn/api-client` package - should be used everywhere
   ```typescript
   import { apiV2 } from '../services/apiV2';
   // No manual token handling needed
   ```

5. **Pattern:** Empty state component instantiation
   - **Files:** `MemberDetailView.tsx`, `AllEndpointsView.tsx`, `EndpointManagement.tsx`
   - **Duplicate code:**
   ```typescript
   (() => {
     const es = getEmptyState('identifier', 'noIdentifiers');
     return (
       <EmptyState
         message={es.message}
         hint={es.hint}
         action={es.action ? { label: es.action.label, onClick: handleAction } : undefined}
       />
     );
   })()
   ```
   - **Solution:** Create wrapper component
   ```typescript
   <SmartEmptyState
     type="identifier"
     scenario="noIdentifiers"
     onAction={handleAction}
   />
   ```

6. **Pattern:** DataTable configuration duplication
   - **Files:** Multiple grid components
   - **Duplicate:** Column definitions, pagination props, styling
   - **Solution:** Already have `defaultDataTableProps` but not consistently applied
   ```typescript
   // Ensure all tables use:
   import { defaultDataTableProps } from './shared/DataTableConfig';
   <DataTable {...defaultDataTableProps} columns={...} />
   ```

#### Validation Duplication

7. **Pattern:** UUID validation
   - **Occurrences:** 10+ files
   - **Duplicate code:**
   ```typescript
   const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
   if (!isUUID) {
     return { status: 400, jsonBody: { error: 'Invalid UUID format' } };
   }
   ```
   - **Solution:** Create validation utility
   ```typescript
   // api/src/utils/validators.ts
   export function validateUUID(id: string): ValidationResult {
     const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
     return {
       valid: pattern.test(id),
       error: pattern.test(id) ? null : 'Invalid UUID format'
     };
   }
   ```

### Duplication Metrics

**Estimated duplication by category:**
- Database pool initialization: 63 instances
- SQL query patterns: 40+ similar queries
- Error handling blocks: 113 try-catch blocks
- MSAL token acquisition: 5+ instances
- UUID validation: 10+ instances
- Empty state rendering: 15+ instances

**Total estimated duplicate lines:** 800-1000 lines (5-7% of codebase)

### Recommendations

1. **Immediate:** Use existing `@ctn/api-client` everywhere, eliminate manual token handling
2. **High Priority:** Create query repository pattern for common database operations
3. **High Priority:** Enforce use of `handleError()` utility in all catch blocks
4. **Medium Priority:** Create validation utilities library
5. **Medium Priority:** Standardize empty state rendering with smart wrapper component

---

## Principle 4: Keep Unit Interfaces Small
**Guideline:** Max 4 parameters per function/method
**Status:** ⚠️ MODERATE VIOLATIONS

### Violations Found

1. **File:** `/admin-portal/src/components/IdentifiersManager.tsx`
   - **Component props:** 6 parameters
   ```typescript
   interface IdentifiersManagerProps {
     legalEntityId: string;                    // 1
     identifiers: LegalEntityIdentifier[];      // 2
     onIdentifierCreate: (...)  => Promise<...>; // 3
     onIdentifierUpdate: (...)  => Promise<...>; // 4
     onIdentifierDelete: (id: string) => Promise<void>; // 5
     onRefresh: () => Promise<void>;            // 6
   }
   ```
   - **Solution:** Group related parameters
   ```typescript
   interface IdentifiersManagerProps {
     legalEntityId: string;
     identifiers: LegalEntityIdentifier[];
     actions: {
       onCreate: (...) => Promise<...>;
       onUpdate: (...) => Promise<...>;
       onDelete: (id: string) => Promise<void>;
       onRefresh: () => Promise<void>;
     };
   }
   ```

2. **File:** `/admin-portal/src/components/ContactsManager.tsx`
   - **Component props:** 5 parameters
   ```typescript
   interface ContactsManagerProps {
     legalEntityId: string;
     contacts: LegalEntityContact[];
     onContactCreate: (...) => Promise<...>;
     onContactUpdate: (...) => Promise<...>;
     onContactDelete: (id: string) => Promise<void>;
   }
   ```
   - **Solution:** Same grouping pattern as above

3. **File:** `/api/src/services/bdiJwtService.ts`
   - **Function:** `generateBvad()` (inferred from usage)
   - **Parameters:** 15+ fields in object parameter
   ```typescript
   generateBvad({
     memberDomain,
     legalName,
     kvk,
     lei,
     euid,
     countryCode,
     registryIdentifiers,
     status,
     complianceChecked,
     complianceLastChecked,
     ownerChecked,
     ownerLastChecked,
     termsVersion,
     termsAcceptedAt,
     adminContact,
     bdiConnectorUri,
     validityHours
   })
   ```
   - **Current:** Uses object parameter (GOOD)
   - **Issue:** Too many fields in single object
   - **Solution:** Group into logical sub-objects
   ```typescript
   interface BvadConfig {
     member: MemberIdentity;        // domain, legalName, identifiers
     compliance: ComplianceStatus;  // complianceChecked, ownerChecked, etc.
     terms: TermsInfo;              // version, acceptedAt
     contact: AdminContact;         // adminContact
     options: BvadOptions;          // validityHours, audience
   }
   ```

### Good Examples Found

1. **File:** `/api/src/functions/ManageEndpoints.ts`
   - **Functions:** `getEndpointsByEntityHandler()`, `createEndpointHandler()`
   - **Parameters:** 2 (request, context) - ✅ EXCELLENT
   - **Pattern:** Standard Azure Functions handler signature

2. **File:** `/api/src/middleware/endpointWrapper.ts`
   - **Function:** `wrapEndpoint(handler, options)`
   - **Parameters:** 2 - ✅ GOOD
   - **Pattern:** Options object for configuration

### Recommendations

1. **Adopt Options Object Pattern:** For functions with >4 related parameters
   ```typescript
   // BEFORE
   function createUser(name: string, email: string, role: string, active: boolean, orgId: string)

   // AFTER
   function createUser(options: CreateUserOptions)
   ```

2. **Group Related Props:** In React components using composition
   ```typescript
   // Extract common patterns
   interface CrudActions<T> {
     onCreate: (item: Omit<T, 'id'>) => Promise<T>;
     onUpdate: (id: string, data: Partial<T>) => Promise<T>;
     onDelete: (id: string) => Promise<void>;
     onRefresh?: () => Promise<void>;
   }

   interface ManagerProps<T> {
     entityId: string;
     items: T[];
     actions: CrudActions<T>;
   }
   ```

---

## Principle 5: Separate Concerns
**Guideline:** Avoid large classes/files - max 100 lines per file
**Status:** ❌ CRITICAL VIOLATIONS

### Violations Found

#### API Files Exceeding Guideline

**Files over 500 lines (Critical):**
1. `ManageM2MClients.ts`: 935 lines - Contains 4 separate handlers (list, create, update, rotate secrets)
2. `EndpointRegistrationWorkflow.ts`: 825 lines - Multi-step workflow with validation, DNS checks, approval
3. `registerMember.ts`: 641 lines - Registration logic + validation + email notifications

**Files over 300 lines (High Priority):**
4. `ManageEndpoints.ts`: 450 lines - Good separation but could extract validators
5. `uploadKvkDocument.ts`: 431 lines - File upload + OCR + validation + storage
6. `UpdateLegalEntity.ts`: 376 lines - Update logic + EUID sync + validation
7. `TierManagement.ts`: 375 lines - Tier logic + DNS validation
8. `validateBvod.ts`: 316 lines - Token validation + claim extraction
9. `generateBvad.ts`: 313 lines - BVAD generation + registry lookups

**Files over 200 lines (Medium Priority):**
- 12 additional files in this range

#### Frontend Files Exceeding Guideline

**Components over 500 lines (Critical):**
1. `TasksGrid.tsx`: 1,147 lines - Task management + filtering + modals
2. `IdentifiersManager.tsx`: 949 lines - Identifier CRUD + validation + EUID logic
3. `MembersGrid.tsx`: 709 lines - Member list + filtering + actions
4. `MemberDetailView.tsx`: 589 lines - 8 tabs + data loading + state management
5. `M2MClientsManager.tsx`: 554 lines - M2M client management + secret rotation
6. `KvkDocumentUpload.tsx`: 517 lines - Upload + preview + OCR + verification

**Components over 300 lines (High Priority):**
- 10+ additional components

### Concern Mixing Examples

1. **File:** `/admin-portal/src/components/MemberDetailView.tsx`
   - **Mixed concerns:**
     - Data fetching (useEffect with API calls)
     - State management (10+ useState hooks)
     - Business logic (handlers for CRUD operations)
     - UI rendering (8 different tab panels)
     - Navigation (tab switching)
     - Error handling
   - **Should be:** Presentation component that composes smaller components

2. **File:** `/api/src/functions/uploadKvkDocument.ts`
   - **Mixed concerns:**
     - HTTP request handling
     - File validation (size, type)
     - Azure Blob Storage operations
     - OCR processing
     - Database updates
     - Notification sending
     - Audit logging
   - **Should be:** Orchestrator calling separate services

3. **File:** `/admin-portal/src/components/EndpointManagement.tsx`
   - **Mixed concerns:**
     - Direct API calls (manual fetch)
     - Token acquisition (MSAL)
     - State management
     - Form handling
     - DataTable configuration
     - Modal management
   - **Should be:** Use `apiV2` client, extract form to separate component

### Recommendations

#### API Refactoring

1. **Split Large Handler Files:**
   ```
   ManageM2MClients.ts (935 lines) →
     ├── handlers/
     │   ├── ListM2MClients.ts (~100 lines)
     │   ├── CreateM2MClient.ts (~100 lines)
     │   ├── UpdateM2MClient.ts (~100 lines)
     │   └── RotateM2MClientSecret.ts (~100 lines)
     ├── validators/
     │   └── m2mClientValidators.ts
     └── services/
         └── m2mClientService.ts
   ```

2. **Extract Business Logic to Services:**
   ```typescript
   // api/src/services/kvkVerificationService.ts
   export class KvkVerificationService {
     async uploadDocument(file: Buffer, metadata: DocumentMetadata): Promise<UploadResult>
     async extractText(blobUrl: string): Promise<OcrResult>
     async validateExtractedData(text: string, expected: KvkData): Promise<ValidationResult>
     async updateVerificationStatus(entityId: string, status: VerificationStatus): Promise<void>
   }
   ```

#### Frontend Refactoring

3. **Split Large Components by Responsibility:**
   ```
   MemberDetailView.tsx (589 lines) →
     ├── MemberDetailView.tsx (~100 lines - orchestrator)
     ├── hooks/
     │   └── useMemberData.ts (~50 lines - data fetching)
     ├── tabs/
     │   ├── CompanyDetailsTab.tsx (~80 lines)
     │   ├── IdentifiersTab.tsx (~80 lines)
     │   ├── SystemIntegrationsTab.tsx (~80 lines)
     │   ├── ContactsTab.tsx (~80 lines)
     │   └── [other tabs...]
     └── components/
         ├── MemberHeader.tsx (~50 lines)
         └── StatusActions.tsx (~40 lines)
   ```

4. **Use Custom Hooks for Data Management:**
   ```typescript
   // hooks/useLegalEntityData.ts
   export function useLegalEntityData(legalEntityId: string) {
     const [entity, setEntity] = useState<LegalEntity | null>(null);
     const [contacts, setContacts] = useState<Contact[]>([]);
     const [identifiers, setIdentifiers] = useState<Identifier[]>([]);
     const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
     const [loading, setLoading] = useState(false);

     // Single useEffect with all data loading
     // Returns: { entity, contacts, identifiers, endpoints, loading, refetch }
   }
   ```

5. **Extract Form Components:**
   ```typescript
   // Instead of inline forms in large components
   EndpointManagement.tsx →
     ├── EndpointManagement.tsx (list view)
     ├── EndpointForm.tsx (create/edit form)
     └── TokenDisplay.tsx (token modal)
   ```

---

## Principle 6: Couple Architecture Components Loosely
**Guideline:** Minimize dependencies between modules
**Status:** ⚠️ MODERATE ISSUES

### Violations Found

1. **Tight Coupling to Azure Functions**
   - **Files affected:** All API functions
   - **Issue:** Direct dependency on `@azure/functions` types throughout codebase
   - **Example:**
   ```typescript
   import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

   async function handler(
     request: HttpRequest,  // Azure-specific
     context: InvocationContext  // Azure-specific
   ): Promise<HttpResponseInit> { // Azure-specific
     // Business logic
   }
   ```
   - **Impact:** Difficult to:
     - Unit test without Azure Functions SDK
     - Migrate to different platform (e.g., Express, Fastify)
     - Run functions in isolation
   - **Solution:** Introduce abstraction layer
   ```typescript
   // api/src/core/types.ts
   interface Request {
     method: string;
     url: string;
     headers: Headers;
     params: Record<string, string>;
     query: URLSearchParams;
     json(): Promise<unknown>;
   }

   interface Response {
     status: number;
     headers?: Record<string, string>;
     body?: unknown;
   }

   interface Logger {
     log(message: string): void;
     error(message: string, error?: unknown): void;
   }

   // Adapter pattern
   function adaptAzureRequest(azureReq: HttpRequest): Request { }
   function adaptAzureContext(azureCtx: InvocationContext): Logger { }
   ```

2. **Direct Database Access in Handlers**
   - **Files affected:** 46 files with `pool.query()`
   - **Issue:** Business logic directly executes SQL
   - **Example:**
   ```typescript
   async function handler(request, context) {
     const pool = getPool();
     const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
     // Direct SQL in handler
   }
   ```
   - **Impact:**
     - Difficult to switch databases
     - Hard to test without real database
     - Query logic scattered across codebase
   - **Solution:** Repository pattern (partially exists, not consistently used)
   ```typescript
   // api/src/repositories/memberRepository.ts
   export class MemberRepository {
     constructor(private pool: Pool) {}

     async findById(id: string): Promise<Member | null> {
       const result = await this.pool.query(
         'SELECT * FROM members WHERE org_id = $1',
         [id]
       );
       return result.rows[0] || null;
     }
   }

   // In handler
   const memberRepo = new MemberRepository(pool);
   const member = await memberRepo.findById(id);
   ```

3. **Frontend: Direct API Calls Instead of Using Client**
   - **Files affected:** `EndpointManagement.tsx`, `APIAccessManager.tsx`
   - **Issue:** Manual `fetch()` with token acquisition instead of using `@ctn/api-client`
   - **Example:**
   ```typescript
   const response = await fetch(`${API_BASE}/legal-entities/${id}/endpoints`, {
     headers: {
       'Authorization': `Bearer ${await getAccessToken()}`
     }
   });
   ```
   - **Impact:**
     - Token handling duplicated
     - No type safety
     - Inconsistent error handling
     - API changes require updates in multiple places
   - **Solution:** Use existing API client
   ```typescript
   import { apiV2 } from '../services/apiV2';
   const endpoints = await apiV2.getEndpoints(legalEntityId);
   ```

4. **Circular Dependencies Risk**
   - **Issue:** Middleware imports utilities, utilities import middleware types
   - **Example:** `auth.ts` imports `database.ts`, which might import types from `auth.ts`
   - **Current status:** Not breaking, but fragile
   - **Solution:** Extract shared types to separate file
   ```typescript
   // api/src/types/index.ts
   export * from './auth';
   export * from './database';
   export * from './middleware';
   ```

### Coupling Metrics

**Dependency fan-out (files with >5 imports):**
- `endpointWrapper.ts`: 14 imports
- `auth.ts`: 17 imports
- `ManageM2MClients.ts`: 7 imports
- `MemberDetailView.tsx`: 23 imports

**Shared utilities (good, low coupling):**
- `logger.ts`: Used by 40+ files ✅
- `database.ts`: Used by 46 files ✅
- `errors.ts`: Used by 15 files (should be 60+) ⚠️

### Recommendations

1. **HIGH:** Introduce repository pattern for database access
2. **HIGH:** Enforce use of `@ctn/api-client` in all frontend components
3. **MEDIUM:** Create platform-agnostic abstractions for Azure Functions
4. **MEDIUM:** Extract shared types to prevent circular dependencies
5. **LOW:** Consider dependency injection for testability

---

## Principle 7: Balance Component Size
**Guideline:** Top-level components should be roughly equal in size/complexity
**Status:** ⚠️ MODERATE ISSUES

### Violations Found

#### API Functions: Size Imbalance

**Massive functions (500+ lines):**
- `ManageM2MClients.ts`: 935 lines
- `EndpointRegistrationWorkflow.ts`: 825 lines
- `registerMember.ts`: 641 lines

**Tiny functions (<50 lines):**
- `GetVersion.ts`: 43 lines
- `healthCheck.ts`: 37 lines
- `DeleteContact.ts`: 32 lines

**Imbalance ratio:** 30:1 (largest to smallest)

**Analysis:**
- Large files handle complex workflows (M2M management, registration)
- Small files handle simple CRUD operations
- **Issue:** Inconsistent abstraction level - some files are "controllers", others are "actions"

**Recommendation:**
All handler files should be ~80-150 lines. Complex workflows should be orchestrated, not implemented inline.

```typescript
// BALANCED APPROACH
// ManageM2MClients.ts (~120 lines)
async function listM2MClientsHandler(request, context) {
  const service = new M2MClientService(getPool());
  const clients = await service.listClients(request.params.legal_entity_id);
  return { status: 200, jsonBody: clients };
}

// M2MClientService.ts (~200 lines)
export class M2MClientService {
  async listClients(legalEntityId: string): Promise<M2MClient[]> {
    // Business logic here
  }
  async createClient(data: CreateM2MClientRequest): Promise<M2MClient> {
    // Business logic here
  }
}
```

#### React Components: Size Imbalance

**Massive components (500+ lines):**
- `TasksGrid.tsx`: 1,147 lines
- `IdentifiersManager.tsx`: 949 lines
- `MembersGrid.tsx`: 709 lines

**Tiny components (<50 lines):**
- `EmptyState.tsx`: ~30 lines
- `icons.tsx`: Various exports, ~20 lines each
- Simple presentational components: 20-40 lines

**Imbalance ratio:** 57:1 (largest to smallest)

**Analysis:**
- Large components are "page-level" components with extensive logic
- Small components are reusable UI elements
- **Issue:** Missing intermediate layer - should have "section" components

**Recommendation:**
Page components: ~100-150 lines (orchestration only)
Section components: ~80-120 lines (specific functionality)
UI components: ~20-60 lines (presentation only)

```typescript
// BALANCED APPROACH
// TasksPage.tsx (~120 lines)
export const TasksPage: React.FC = () => {
  const { tasks, loading } = useTasks();
  return (
    <PageLayout title="Tasks">
      <TaskFilters />
      <TasksGrid tasks={tasks} loading={loading} />
    </PageLayout>
  );
};

// TasksGrid.tsx (~100 lines) - just the grid
// TaskFilters.tsx (~80 lines) - filter controls
// TaskRow.tsx (~40 lines) - single row
```

### Recommendations

1. **Establish Size Guidelines:**
   - API handlers: 80-150 lines
   - Services/Business logic: 150-300 lines
   - Page components: 100-150 lines
   - Section components: 80-120 lines
   - UI components: 20-60 lines

2. **Refactor Outliers:**
   - Split files >300 lines into multiple files
   - Consolidate tiny files (<30 lines) if they share purpose
   - Extract business logic from handlers to services

3. **Use Consistent Patterns:**
   - All API functions follow same structure (handler + service)
   - All pages follow same component hierarchy

---

## Principle 8: Keep Codebase Small
**Guideline:** Eliminate dead code, unused dependencies
**Status:** ⚠️ MODERATE ISSUES

### Dead Code Found

1. **Confirmed Dead Files (Already Deleted):**
   - ✅ `createEndpoint.ts` - DELETED
   - ✅ `getEndpointsByEntity.ts` - DELETED
   - **Good:** Recent cleanup shows awareness of this principle

2. **Potentially Unused Functions (Require Verification):**
   - `api/src/functions/simpleTest.ts` - 7 lines - Test function, likely unused in production
   - `api/src/functions/GetContainerStatus.ts` - Container tracking - is this still needed?
   - `api/src/functions/GetETAUpdates.ts` - ETA updates - verify usage
   - `api/src/functions/ManageBookings.ts` - Bookings - is this in scope?

3. **Commented-Out Code:**
   - `admin-portal/src/components/AllEndpointsView.tsx:10`
   ```typescript
   // import { PageHeader } from './PageHeader'; // Component removed
   ```
   - **Recommendation:** Delete commented imports, rely on git history

4. **Unused Imports:**
   - **Tool needed:** Run `npx eslint --fix` with `no-unused-vars` rule
   - Manual spot check shows clean imports in recent files

### Dependency Analysis

**Root package.json:**
- **Total dependencies:** 449 packages (including transitive)
- **Issue:** No automatic analysis available without running audit

**Recommendations for dependency cleanup:**

1. **Run dependency analysis:**
   ```bash
   npx depcheck
   npx npm-check
   ```

2. **Check for unused packages:**
   - Look for packages not imported anywhere
   - Check for duplicate packages (different versions)

3. **Audit dev dependencies:**
   - Ensure all dev dependencies are actually used in build/test scripts

### Build Artifacts

**Issue:** Compiled files in source control?
- Check if `api/dist/` is in git (should be gitignored)
- Check if `admin-portal/dist/` is in git (should be gitignored)

**Verification needed:**
```bash
git ls-files | grep "dist/"
git ls-files | grep ".js$" | grep -v "node_modules"
```

### Database Migrations

**Issue:** Old migration files accumulating
- **Current:** 28+ migration files
- **Recommendation:**
  - Keep all migrations (needed for audit trail)
  - Consider squashing old migrations in major versions
  - Archive migrations older than 6 months to separate folder

### Recommendations

1. **IMMEDIATE:**
   - Delete commented-out code (rely on git)
   - Remove unused imports with ESLint auto-fix
   - Verify and delete test functions (`simpleTest.ts`)

2. **HIGH PRIORITY:**
   - Run `depcheck` and remove unused npm packages
   - Audit container/booking endpoints - are they in scope?
   - Ensure `dist/` folders are gitignored

3. **MEDIUM PRIORITY:**
   - Set up automated unused code detection in CI
   - Establish policy: delete commented code on sight
   - Regular quarterly dependency audit

4. **TOOLING:**
   ```json
   // .eslintrc.json
   {
     "rules": {
       "no-unused-vars": "error",
       "no-commented-out-code": "warn"
     }
   }
   ```

---

## Principle 9: Automate Tests
**Guideline:** High test coverage, automated test suite
**Status:** ❌ SIGNIFICANT GAPS

### Current Test Coverage

#### API (Backend)
- **Unit tests:** ❌ NONE FOUND
- **Integration tests:** ❌ NONE FOUND
- **E2E tests:** ⚠️ Manual curl testing only
- **Coverage:** 0%

**Critical gap:** No automated tests for business logic, middleware, or database queries.

#### Admin Portal (Frontend)
- **Unit tests:** ✅ Vitest configured
  - Test files found: `__tests__/*.test.tsx`
  - Examples: `MantineNotifications.test.tsx`, `MantineDataTable.test.tsx`, `MantineModal.test.tsx`
  - **Coverage:** Unknown (need to run `npm run test:coverage`)

- **E2E tests:** ✅ Playwright configured
  - Test files: `admin-portal/tests/*.spec.ts`
  - Configuration: `playwright.config.ts` exists
  - Auth state: Saved to `playwright/.auth/user.json`
  - **Status:** Tests exist but coverage unknown

- **Coverage:** Estimated 20-30% (component tests only)

#### Member Portal (Frontend)
- **Unit tests:** ⚠️ Not found
- **E2E tests:** ⚠️ Not found
- **Coverage:** Estimated <5%

### Testing Anti-Patterns Found

1. **Manual Testing Reliance:**
   - CLAUDE.md instructs: "Test API FIRST with curl, THEN UI"
   - **Issue:** Manual testing not repeatable, not automated
   - **Solution:** Convert curl tests to automated Jest/Supertest tests

2. **Test Data Hardcoded:**
   - Test user credentials in CLAUDE.md
   - **Issue:** Tests depend on specific user existing
   - **Solution:** Use test fixtures, seed test database

3. **No Test Database:**
   - Tests run against dev database
   - **Issue:** Tests pollute dev data, not isolated
   - **Solution:** Separate test database, transaction rollback after tests

### Missing Test Categories

#### API Missing Tests:

1. **Middleware tests:**
   - `endpointWrapper.ts` - 531 lines, 0 tests
   - `auth.ts` - 764 lines, 0 tests
   - `rbac.ts` - 0 tests
   - **Impact:** CRITICAL - middleware used by ALL endpoints

2. **Handler tests:**
   - All 67 API functions have 0 unit tests
   - **Impact:** HIGH - no verification of business logic

3. **Database query tests:**
   - No tests for query correctness
   - No tests for transaction handling
   - **Impact:** HIGH - data integrity risks

4. **Validation tests:**
   - UUID validation
   - Input validation
   - Schema validation
   - **Impact:** MEDIUM - security risks

#### Frontend Missing Tests:

1. **Component tests:**
   - Large components like `MemberDetailView.tsx` (589 lines) - 0 tests
   - Form components - minimal tests
   - **Impact:** HIGH - UI regression risks

2. **Integration tests:**
   - API client integration - 0 tests
   - MSAL authentication flow - 0 tests
   - **Impact:** MEDIUM - integration failures

3. **Accessibility tests:**
   - WCAG compliance - not tested
   - Screen reader compatibility - not tested
   - **Impact:** HIGH - compliance risk

### Test Quality Issues

**Playwright tests (if they exist):**
- ⚠️ Serial execution (documented in CLAUDE.md)
- ⚠️ Auth state reused across tests (can cause flakiness)
- ⚠️ 60-second timeout (too long)
- ⚠️ Test depends on deployed environment (not local)

### Recommendations

#### Immediate Actions (High Priority)

1. **Set up API unit testing framework:**
   ```bash
   cd api
   npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
   ```

2. **Create test database:**
   ```bash
   # Add to .env.test
   DATABASE_URL=postgresql://test:test@localhost:5432/asr_test
   ```

3. **Write tests for critical middleware:**
   ```typescript
   // api/src/middleware/__tests__/auth.test.ts
   describe('authenticate middleware', () => {
     it('should reject missing Authorization header', async () => {
       const request = mockRequest({ headers: {} });
       const result = await authenticate(request, mockContext());
       expect(result.success).toBe(false);
       expect(result.response.status).toBe(401);
     });

     it('should validate JWT signature', async () => {
       const request = mockRequest({
         headers: { authorization: 'Bearer invalid-token' }
       });
       const result = await authenticate(request, mockContext());
       expect(result.success).toBe(false);
     });

     it('should resolve party ID from valid token', async () => {
       const validToken = generateTestToken({ oid: 'test-oid' });
       const request = mockRequest({
         headers: { authorization: `Bearer ${validToken}` }
       });
       const result = await authenticate(request, mockContext());
       expect(result.success).toBe(true);
       expect(result.request.partyId).toBeDefined();
     });
   });
   ```

4. **Write tests for critical business logic:**
   ```typescript
   // api/src/functions/__tests__/generateBvad.test.ts
   describe('generateBvad handler', () => {
     beforeEach(async () => {
       await seedTestDatabase();
     });

     afterEach(async () => {
       await rollbackTestDatabase();
     });

     it('should generate BVAD for active member', async () => {
       const request = mockAuthenticatedRequest({
         body: { memberDomain: 'test-member.com' }
       });
       const response = await handler(request, mockContext());
       expect(response.status).toBe(200);
       expect(response.jsonBody).toHaveProperty('bvad_token');
     });

     it('should reject BVAD for inactive member', async () => {
       const request = mockAuthenticatedRequest({
         body: { memberDomain: 'inactive-member.com' }
       });
       const response = await handler(request, mockContext());
       expect(response.status).toBe(403);
     });
   });
   ```

#### Medium Priority Actions

5. **Automate curl tests:**
   ```typescript
   // Convert manual curl tests to Jest + Supertest
   // api/tests/integration/endpoints.test.ts
   describe('Endpoint Management API', () => {
     it('GET /v1/legal-entities/:id/endpoints', async () => {
       const response = await request(app)
         .get('/api/v1/legal-entities/test-id/endpoints')
         .set('Authorization', `Bearer ${testToken}`)
         .expect(200);

       expect(Array.isArray(response.body)).toBe(true);
     });
   });
   ```

6. **Add component tests for critical UI:**
   ```typescript
   // admin-portal/src/components/__tests__/MemberDetailView.test.tsx
   import { render, screen, waitFor } from '@testing-library/react';
   import { MemberDetailView } from '../MemberDetailView';

   describe('MemberDetailView', () => {
     it('should load and display member details', async () => {
       const member = createTestMember();
       render(<MemberDetailView member={member} onBack={jest.fn()} />);

       await waitFor(() => {
         expect(screen.getByText(member.legal_name)).toBeInTheDocument();
       });
     });

     it('should handle tab switching', async () => {
       const member = createTestMember();
       render(<MemberDetailView member={member} onBack={jest.fn()} />);

       fireEvent.click(screen.getByText('Identifiers'));
       expect(screen.getByText('Legal Identifiers')).toBeInTheDocument();
     });
   });
   ```

7. **Set up coverage thresholds:**
   ```json
   // api/package.json
   {
     "jest": {
       "coverageThreshold": {
         "global": {
           "branches": 60,
           "functions": 60,
           "lines": 60,
           "statements": 60
         }
       }
     }
   }
   ```

#### Long-term Goals

8. **Achieve coverage targets:**
   - API: 80% line coverage, 70% branch coverage
   - Frontend: 70% line coverage, 60% branch coverage
   - Critical paths: 100% coverage (auth, RBAC, payment, data validation)

9. **Integrate into CI/CD:**
   ```yaml
   # .azure-pipelines/asr-api.yml
   - task: Npm@1
     displayName: 'Run API Tests'
     inputs:
       command: 'custom'
       customCommand: 'test -- --coverage --ci'

   - task: PublishCodeCoverageResults@1
     inputs:
       codeCoverageTool: 'Cobertura'
       summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'

   - script: |
       if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 60 ]; then
         echo "Coverage below 60%"
         exit 1
       fi
     displayName: 'Check Coverage Threshold'
   ```

10. **Testing best practices:**
    - AAA pattern (Arrange, Act, Assert)
    - One assertion per test (when possible)
    - Descriptive test names
    - Test behaviors, not implementation
    - Mock external dependencies (API calls, database)

---

## Principle 10: Write Clean Code
**Guideline:** Avoid code smells
**Status:** ⚠️ MODERATE ISSUES

### Code Smells Found

#### 1. Magic Numbers/Strings

**Severity:** Medium
**Occurrences:** 20+

**Examples:**

1. **File:** `/api/src/middleware/rateLimiter.ts` (inferred)
   - Magic numbers: `100` (rate limit), `600000` (cache time), `10` (requests per minute)
   - **Solution:** Named constants
   ```typescript
   const RATE_LIMITS = {
     API: { requests: 100, windowMs: 60_000 },
     AUTH: { requests: 10, windowMs: 60_000 }
   } as const;

   const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
   ```

2. **File:** `/api/src/middleware/auth.ts:28`
   - Magic number: `600000` (JWKS cache duration)
   ```typescript
   cacheMaxAge: 600000, // 10 minutes
   ```
   - **Solution:**
   ```typescript
   const JWKS_CACHE_DURATION_MS = 10 * 60 * 1000;
   const JWKS_REQUESTS_PER_MINUTE = 10;

   const jwksClientInstance = jwksClient({
     jwksUri: JWKS_URI,
     cache: true,
     cacheMaxAge: JWKS_CACHE_DURATION_MS,
     rateLimit: true,
     jwksRequestsPerMinute: JWKS_REQUESTS_PER_MINUTE,
   });
   ```

3. **File:** `/api/src/functions/generateBvad.ts:226`
   - Magic string: `'v3.2.0'` (terms version)
   ```typescript
   termsVersion: member.metadata?.termsVersion || 'v3.2.0',
   ```
   - **Solution:**
   ```typescript
   const DEFAULT_TERMS_VERSION = 'v3.2.0';
   termsVersion: member.metadata?.termsVersion || DEFAULT_TERMS_VERSION,
   ```

4. **File:** `/admin-portal/src/components/AllEndpointsView.tsx:38`
   - Magic number: `10` (page size)
   ```typescript
   const pageSize = 10;
   ```
   - **Solution:**
   ```typescript
   const DEFAULT_PAGE_SIZE = 10;
   ```

#### 2. Long Parameter Lists

**Severity:** Medium
**Occurrences:** 15+ (covered in Principle 4)

**Top offenders:**
- React component props with 5-6 parameters
- Service functions with 7+ parameters passed as object (acceptable but could group better)

#### 3. God Objects

**Severity:** High
**Occurrences:** 3

1. **Object:** `AuthenticatedRequest` interface
   - **File:** `/api/src/middleware/auth.ts:145-168`
   - **Properties:** 18+ properties
   ```typescript
   export interface AuthenticatedRequest {
     // HttpRequest properties (5)
     method, url, headers, query, params,
     // Body methods (3)
     text, json, arrayBuffer,
     // Auth properties (10+)
     user, userId, userEmail, userRoles, partyId,
     isM2M, clientId, ...
   }
   ```
   - **Issue:** Single object knows too much
   - **Solution:** Composition
   ```typescript
   interface HttpContext {
     method: string;
     url: string;
     headers: Headers;
     query: URLSearchParams;
     params: Record<string, string>;
   }

   interface AuthContext {
     user: JwtPayload;
     userId: string;
     userEmail?: string;
     roles: string[];
     type: 'user' | 'm2m';
   }

   interface PartyContext {
     partyId?: string;
   }

   interface AuthenticatedRequest {
     http: HttpContext;
     auth: AuthContext;
     party?: PartyContext;
     body: BodyMethods;
   }
   ```

2. **Component:** `MemberDetailView`
   - **File:** `/admin-portal/src/components/MemberDetailView.tsx`
   - **State variables:** 10+
   - **Handler methods:** 15+
   - **Issue:** Component does everything
   - **Solution:** Already covered in Principle 5

#### 4. Feature Envy

**Severity:** Low
**Occurrences:** 5+

**Example:**

**File:** `/admin-portal/src/components/EndpointManagement.tsx:19-31`
```typescript
const getAccessToken = async (): Promise<string> => {
  const accounts = (window as any).msalInstance?.getAllAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No authenticated user');
  }
  const request = {
    scopes: ['api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user'],
    account: accounts[0],
  };
  const response = await (window as any).msalInstance.acquireTokenSilent(request);
  return response.accessToken;
};
```

**Issue:** Component reaching into global MSAL instance, manipulating its data
**Solution:** MSAL service should handle this
```typescript
// services/authService.ts
export class AuthService {
  static async getAccessToken(): Promise<string> {
    // Logic here
  }
}

// In component
import { AuthService } from '../services/authService';
const token = await AuthService.getAccessToken();

// Better: Use existing apiV2 client which already handles this
import { apiV2 } from '../services/apiV2';
```

#### 5. Inappropriate Intimacy

**Severity:** Medium
**Occurrences:** 10+

**Example:**

**File:** Multiple components accessing `(window as any).msalInstance`
**Issue:** Components directly accessing global window object, bypassing encapsulation
**Solution:** Use React context or service
```typescript
// contexts/AuthContext.tsx
export const AuthContext = createContext<{
  instance: PublicClientApplication;
  getToken: () => Promise<string>;
}>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

// In component
const { getToken } = useAuth();
```

#### 6. Comments That Explain "What" Instead of "Why"

**Severity:** Low
**Occurrences:** 20+

**Examples:**

1. **File:** `/api/src/functions/ManageEndpoints.ts:66`
   ```typescript
   // Handler: Create Endpoint
   async function createEndpointHandler(...) {
   ```
   - **Issue:** Function name already says this
   - **Better:** Explain business rules
   ```typescript
   // Create endpoint and activate immediately unless explicitly disabled
   // Generates audit log for compliance tracking
   async function createEndpointHandler(...) {
   ```

2. **File:** `/api/src/middleware/endpointWrapper.ts:165`
   ```typescript
   // Handle CORS preflight
   if (request.method === 'OPTIONS' && enableCors) {
   ```
   - **Issue:** Code is self-explanatory
   - **Better:** Remove comment, code is clear

**Good example:**

**File:** `/api/src/middleware/endpointWrapper.ts:387-390`
```typescript
// SEC-004: CSRF protection for state-changing requests
// Minimal enforcement for current cross-domain architecture:
// - Require presence of custom X-CSRF-Token header on POST/PUT/PATCH/DELETE
// - This header cannot be set by cross-site forms, mitigating CSRF
// - When/if same-domain cookies are feasible, switch to validateCsrf()
```
- ✅ **Good:** Explains WHY this approach, references security requirement, notes future migration path

#### 7. Inconsistent Naming

**Severity:** Low
**Occurrences:** 10+

**Examples:**

1. **Inconsistent ID property names:**
   - `legal_entity_id` (database style)
   - `legalEntityId` (camelCase)
   - `org_id` vs `organizationId`
   - **Solution:** Pick one convention, use consistently

2. **Inconsistent handler naming:**
   - `handler()` - generic
   - `getEndpointsByEntityHandler()` - descriptive
   - `createEndpointHandler()` - descriptive
   - **Solution:** Always use descriptive names

3. **Inconsistent boolean naming:**
   - `is_active`, `is_deleted` (database)
   - `isActive`, `isDeleted` (TypeScript)
   - `enabled`, `disabled` (no is_ prefix)
   - **Solution:** Always use `is` prefix for booleans

#### 8. Dead/Commented Code

**Severity:** Low
**Occurrences:** 5+ (covered in Principle 8)

**Example:**
```typescript
// import { PageHeader } from './PageHeader'; // Component removed
```
**Solution:** Delete, rely on git history

#### 9. Deeply Nested Code

**Severity:** Medium
**Occurrences:** 10+

**Example:**

**File:** `/api/src/middleware/endpointWrapper.ts:166-175`
```typescript
if (request.method === 'OPTIONS' && enableCors) {
  const origin = safeGetHeader(request.headers, 'origin');
  return {
    status: 204,
    headers: {
      ...getCorsHeaders(origin, allowedOrigins),
      'X-Request-ID': requestId
    },
  };
}
```

**Better with guard clause:**
```typescript
const isCorsPreflight = request.method === 'OPTIONS' && enableCors;
if (!isCorsPreflight) return handleRequest();

const origin = safeGetHeader(request.headers, 'origin');
return {
  status: 204,
  headers: {
    ...getCorsHeaders(origin, allowedOrigins),
    'X-Request-ID': requestId
  },
};
```

#### 10. Type Assertions and `any`

**Severity:** Medium
**Occurrences:** 50+

**Examples:**

1. **File:** `/api/src/functions/generateBvad.ts:32`
   ```typescript
   const body = await request.json() as GenerateBvadRequest;
   ```
   - **Issue:** Runtime type not validated
   - **Solution:** Use validation library (Zod, Joi)
   ```typescript
   import { z } from 'zod';

   const GenerateBvadRequestSchema = z.object({
     memberDomain: z.string().optional(),
     kvk: z.string().optional(),
     lei: z.string().optional(),
     audience: z.string().optional(),
     validityHours: z.number().optional()
   });

   const rawBody = await request.json();
   const body = GenerateBvadRequestSchema.parse(rawBody);
   ```

2. **File:** `/admin-portal/src/components/EndpointManagement.tsx:21`
   ```typescript
   const accounts = (window as any).msalInstance?.getAllAccounts();
   ```
   - **Issue:** Bypassing type system
   - **Solution:** Proper typing
   ```typescript
   // global.d.ts
   interface Window {
     msalInstance?: PublicClientApplication;
   }

   // In component
   const accounts = window.msalInstance?.getAllAccounts();
   ```

3. **File:** `/api/src/functions/ManageEndpoints.ts:75`
   ```typescript
   const body = await request.json() as any;
   ```
   - **Issue:** No type safety at all
   - **Solution:** Define interface and validate
   ```typescript
   interface CreateEndpointRequest {
     endpoint_name: string;
     endpoint_url?: string;
     endpoint_description?: string;
     data_category?: string;
     endpoint_type?: string;
     is_active?: boolean;
   }

   const body = await request.json() as CreateEndpointRequest;
   // Better: validate with Zod
   ```

### Clean Code Recommendations

#### Immediate Actions

1. **Extract magic numbers to named constants:**
   ```typescript
   // api/src/config/constants.ts
   export const TIMEOUTS = {
     JWKS_CACHE_MS: 10 * 60 * 1000,
     REQUEST_TIMEOUT_MS: 30 * 1000,
   } as const;

   export const RATE_LIMITS = {
     API: { requests: 100, window: 60_000 },
     AUTH: { requests: 10, window: 60_000 },
   } as const;

   export const DEFAULTS = {
     PAGE_SIZE: 10,
     TERMS_VERSION: 'v3.2.0',
   } as const;
   ```

2. **Add runtime validation for API inputs:**
   ```bash
   npm install zod
   ```
   ```typescript
   import { z } from 'zod';

   const requestSchema = z.object({
     endpoint_name: z.string().min(1),
     endpoint_url: z.string().url().optional(),
   });

   const validatedBody = requestSchema.parse(await request.json());
   ```

3. **Remove commented code:**
   - Run search for `// import`
   - Run search for `/* ... */` blocks
   - Delete all, rely on git

4. **Fix inconsistent naming:**
   - Standardize on `is_` prefix for booleans
   - Use camelCase in TypeScript, snake_case in database
   - Transform at boundary (database ↔ TypeScript)

#### Medium Priority Actions

5. **Refactor god objects:**
   - Split `AuthenticatedRequest` into composition
   - Extract concerns from large components

6. **Eliminate feature envy:**
   - Create `AuthService` for MSAL operations
   - Create `DatabaseService` for common queries
   - Enforce use of `@ctn/api-client`

7. **Add proper TypeScript declarations:**
   ```typescript
   // global.d.ts
   interface Window {
     msalInstance?: PublicClientApplication;
   }
   ```

8. **Reduce nesting:**
   - Use guard clauses
   - Extract complex conditions to named booleans
   - Flatten Promise chains with async/await

#### Long-term Improvements

9. **Establish linting rules:**
   ```json
   // .eslintrc.json
   {
     "rules": {
       "max-depth": ["error", 3],
       "max-lines-per-function": ["warn", 50],
       "complexity": ["warn", 10],
       "@typescript-eslint/no-explicit-any": "error",
       "@typescript-eslint/explicit-function-return-type": "warn",
       "no-magic-numbers": ["warn", { "ignore": [0, 1, -1] }]
     }
   }
   ```

10. **Code review checklist:**
    - [ ] No magic numbers/strings
    - [ ] No `any` types
    - [ ] No commented code
    - [ ] Comments explain "why" not "what"
    - [ ] Functions <50 lines
    - [ ] Cyclomatic complexity <10
    - [ ] Consistent naming conventions
    - [ ] Input validation with schema

---

## Quick Wins (Easy Fixes)

These can be fixed in <2 hours each and will immediately improve code quality:

### 1. Extract Magic Numbers (30 minutes)
- Create `api/src/config/constants.ts`
- Move all magic numbers from middleware
- Update imports

### 2. Remove Commented Code (15 minutes)
```bash
# Find all commented imports
grep -r "// import" admin-portal/src admin-portal/src --include="*.tsx" --include="*.ts"
# Delete them (manual review first)
```

### 3. Enforce `@ctn/api-client` Usage (1 hour)
- Replace manual `fetch()` in `EndpointManagement.tsx`
- Replace manual `fetch()` in `APIAccessManager.tsx`
- Delete duplicate `getAccessToken()` functions

### 4. Use Existing `handleError()` Utility (1 hour)
- Find all manual error handlers: `grep -r "} catch (error)" api/src/functions`
- Replace with `return handleError(error, context, requestId);`

### 5. Extract Database Query to Repository (2 hours)
```typescript
// api/src/repositories/legalEntityRepository.ts
export class LegalEntityRepository {
  static async exists(pool: Pool, id: string): Promise<boolean>
  static async findById(pool: Pool, id: string): Promise<LegalEntity | null>
}

// Replace 15+ duplicate queries across handlers
```

### 6. Add TypeScript Window Declaration (10 minutes)
```typescript
// admin-portal/src/global.d.ts
interface Window {
  msalInstance?: PublicClientApplication;
}
```

### 7. Run ESLint Auto-fix (5 minutes)
```bash
cd admin-portal
npx eslint --fix src/
cd ../api
npx eslint --fix src/
```

### 8. Extract CORS Headers Function (30 minutes)
- Already exists in `endpointWrapper.ts` as `getCorsHeaders()`
- Extract to `api/src/utils/cors.ts`
- Reuse across all middleware

### 9. Standardize Error Responses (1 hour)
```typescript
// api/src/utils/responses.ts
export const ErrorResponses = {
  badRequest: (message: string) => ({ status: 400, jsonBody: { error: message } }),
  unauthorized: (message: string) => ({ status: 401, jsonBody: { error: message } }),
  forbidden: (message: string) => ({ status: 403, jsonBody: { error: message } }),
  notFound: (message: string) => ({ status: 404, jsonBody: { error: message } }),
  serverError: (message: string) => ({ status: 500, jsonBody: { error: message } }),
};
```

### 10. Extract Validation Utilities (1 hour)
```typescript
// api/src/utils/validators.ts
export function validateUUID(id: string): boolean
export function validateEmail(email: string): boolean
export function validateUrl(url: string): boolean
```

**Total quick wins time: ~8 hours**
**Impact: Eliminate ~500 lines of duplicate code, improve consistency**

---

## Refactoring Priorities

Ranked by impact vs effort:

### Priority 1: Critical Path (High Impact, Medium Effort)

1. **Refactor `endpointWrapper.ts`** (affects ALL endpoints)
   - **Effort:** 8 hours
   - **Impact:** Reduces complexity from 20 to ~5 per function
   - **Approach:** Extract middleware pipeline pattern
   - **Risk:** Medium - requires careful testing

2. **Create Repository Pattern** (eliminates 40+ duplicate queries)
   - **Effort:** 12 hours
   - **Impact:** DRY principle, testability
   - **Approach:** Start with `LegalEntityRepository`, `MemberRepository`
   - **Risk:** Low - additive change

3. **Add API Unit Tests** (0% → 60% coverage)
   - **Effort:** 40 hours (spread over time)
   - **Impact:** Confidence in refactoring, catch regressions
   - **Approach:** Start with middleware, then critical handlers
   - **Risk:** Low - no production changes

### Priority 2: Large Components (High Impact, High Effort)

4. **Split `MemberDetailView.tsx`** (589 lines → 8 files)
   - **Effort:** 12 hours
   - **Impact:** Maintainability, reusability
   - **Approach:** Extract each tab to component, create custom hooks
   - **Risk:** Medium - UI changes need QA

5. **Split `ManageM2MClients.ts`** (935 lines → 4 handlers + service)
   - **Effort:** 10 hours
   - **Impact:** SRP, testability
   - **Approach:** One handler per route, extract service layer
   - **Risk:** Low - well-defined boundaries

6. **Split `TasksGrid.tsx`** (1,147 lines → 5 components)
   - **Effort:** 16 hours
   - **Impact:** Maintainability
   - **Approach:** Extract filters, modals, custom hooks
   - **Risk:** Medium - complex state management

### Priority 3: Architectural Improvements (Medium Impact, High Effort)

7. **Introduce Service Layer** (decouple business logic)
   - **Effort:** 24 hours
   - **Impact:** Testability, platform independence
   - **Approach:** Extract business logic from handlers to services
   - **Risk:** High - significant refactoring

8. **Runtime Validation with Zod** (eliminate `as any`)
   - **Effort:** 20 hours
   - **Impact:** Type safety, better errors
   - **Approach:** Add schemas for all API inputs
   - **Risk:** Low - improves security

9. **Eliminate Direct Azure Dependencies** (platform independence)
   - **Effort:** 32 hours
   - **Impact:** Testability, portability
   - **Approach:** Create abstraction layer
   - **Risk:** High - fundamental architecture change

### Priority 4: Code Quality (Low Impact, Low Effort)

10. **Quick Wins** (see section above)
    - **Effort:** 8 hours
    - **Impact:** Consistency, eliminate duplication
    - **Risk:** Very low

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- ✅ **Day 1-2:** Quick wins (8 hours)
- ✅ **Day 3-5:** Set up testing framework (16 hours)
- ✅ **Day 6-10:** Create repository pattern (12 hours)

**Deliverables:**
- Magic numbers eliminated
- Test framework configured
- Basic repositories for common queries
- 20% test coverage

### Phase 2: Critical Path (Week 3-6)
- ✅ **Week 3:** Refactor `endpointWrapper.ts` (8 hours)
- ✅ **Week 4:** Add middleware tests (12 hours)
- ✅ **Week 5-6:** Add handler tests (20 hours)

**Deliverables:**
- Simplified middleware (complexity <5)
- 60% test coverage
- All endpoints tested

### Phase 3: Component Splitting (Week 7-10)
- ✅ **Week 7-8:** Split `MemberDetailView.tsx` (12 hours)
- ✅ **Week 9:** Split `ManageM2MClients.ts` (10 hours)
- ✅ **Week 10:** Split other large components (16 hours)

**Deliverables:**
- All files <300 lines
- Improved component reusability
- Better separation of concerns

### Phase 4: Architecture (Week 11-16)
- ✅ **Week 11-12:** Introduce service layer (24 hours)
- ✅ **Week 13-14:** Add runtime validation (20 hours)
- ✅ **Week 15-16:** Platform abstraction (32 hours)

**Deliverables:**
- Service layer for all business logic
- Input validation with Zod
- Platform-agnostic handlers

### Phase 5: Polish (Week 17-18)
- ✅ **Week 17:** Achieve 80% test coverage (16 hours)
- ✅ **Week 18:** Code review, documentation (8 hours)

**Deliverables:**
- 80% line coverage, 70% branch coverage
- Updated documentation
- Clean, maintainable codebase

**Total estimated effort:** ~270 hours (~7 weeks full-time, or 17 weeks at 50%)

---

## Code Examples

### Example 1: Refactoring Long Function

**BEFORE (generateBvad handler - 280 lines):**

```typescript
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Generate BVAD endpoint called');

  try {
    const pool = getPool();
    const body = await request.json() as GenerateBvadRequest;
    const { memberDomain, kvk, lei, audience, validityHours } = body;

    if (!memberDomain && !kvk && !lei) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'invalid_request',
          error_description: 'Must provide memberDomain, kvk, or lei to identify member',
        }),
      };
    }

    // 250 more lines of database queries, validation, business logic...
  } catch (error) {
    context.error('Error generating BVAD:', error);
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'internal_server_error',
        error_description: 'Failed to generate BVAD token',
      }),
    };
  }
}
```

**AFTER (refactored - 40 lines):**

```typescript
// handler.ts
async function handler(
  request: AuthenticatedRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = validateBvadRequest(await request.json());
    const service = new BvadService(getPool(), context);

    const member = await service.findMember(body);
    service.validateEligibility(member);

    const identifiers = await service.getRegistryIdentifiers(member.legal_entity_id);
    const claims = service.buildClaims(member, identifiers, body);

    const token = generateBvad(claims);
    await service.auditIssuance(token, member, request.userId);

    return {
      status: 200,
      jsonBody: {
        bvad_token: token,
        token_type: 'Bearer',
        expires_in: (body.validityHours || 24) * 3600,
        member: service.formatMemberInfo(member, identifiers),
        jti: extractJti(token)
      }
    };
  } catch (error) {
    return handleError(error, context, getRequestId(request));
  }
}

// services/bvadService.ts
export class BvadService {
  constructor(private pool: Pool, private context: InvocationContext) {}

  async findMember(criteria: FindMemberCriteria): Promise<Member> {
    // ~20 lines
  }

  validateEligibility(member: Member): void {
    // ~15 lines - throws on failure
  }

  async getRegistryIdentifiers(legalEntityId: string): Promise<RegistryIdentifier[]> {
    // ~25 lines
  }

  buildClaims(member: Member, identifiers: RegistryIdentifier[], options: BvadOptions): BvadClaims {
    // ~30 lines
  }

  async auditIssuance(token: string, member: Member, userId: string): Promise<void> {
    // ~20 lines
  }

  formatMemberInfo(member: Member, identifiers: RegistryIdentifier[]): MemberInfo {
    // ~15 lines
  }
}

// validators/bvadValidators.ts
export function validateBvadRequest(body: unknown): GenerateBvadRequest {
  const schema = z.object({
    memberDomain: z.string().optional(),
    kvk: z.string().optional(),
    lei: z.string().optional(),
    audience: z.string().optional(),
    validityHours: z.number().int().positive().optional()
  }).refine(
    (data) => data.memberDomain || data.kvk || data.lei,
    { message: 'Must provide memberDomain, kvk, or lei' }
  );

  return schema.parse(body);
}
```

**Benefits:**
- Handler reduced from 280 to 40 lines
- Each service method <30 lines
- Easy to test each method independently
- Clear separation of concerns
- Type-safe validation

---

### Example 2: Eliminating Duplication

**BEFORE (duplicated in 5+ files):**

```typescript
// EndpointManagement.tsx
const getAccessToken = async (): Promise<string> => {
  const accounts = (window as any).msalInstance?.getAllAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No authenticated user');
  }
  const request = {
    scopes: ['api://d3037c11-a541-4f21-8862-8079137a0cde/access_as_user'],
    account: accounts[0],
  };
  const response = await (window as any).msalInstance.acquireTokenSilent(request);
  return response.accessToken;
};

const loadEndpoints = async () => {
  setLoading(true);
  try {
    const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const data = await response.json();
    setEndpoints(Array.isArray(data) ? data : (data.endpoints || []));
  } catch (error) {
    console.error('Error loading endpoints:', error);
  } finally {
    setLoading(false);
  }
};
```

**AFTER (use existing apiV2 client):**

```typescript
// EndpointManagement.tsx
import { apiV2 } from '../services/apiV2';
import { useNotification } from '../contexts/NotificationContext';

const loadEndpoints = async () => {
  setLoading(true);
  try {
    const endpoints = await apiV2.getEndpoints(legalEntityId);
    setEndpoints(endpoints);
  } catch (error) {
    logger.error('Failed to load endpoints:', error);
    notification.showError('Failed to load endpoints');
  } finally {
    setLoading(false);
  }
};
```

**Benefits:**
- Eliminates 20+ lines of duplicate code per file
- Type-safe API calls
- Automatic token handling
- Consistent error handling
- Single source of truth for API interactions

---

### Example 3: Simplifying Complex Middleware

**BEFORE (wrapEndpoint - 339 lines, complexity ~20):**

```typescript
export function wrapEndpoint(
  handler: EndpointHandler,
  options: EndpointOptions = {}
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  const {
    requireAuth = true,
    requiredRoles,
    requiredPermissions,
    requireAllPermissions = true,
    enableCors = true,
    allowedOrigins = DEFAULT_CORS_ORIGINS,
    enableRateLimit = true,
    rateLimiterType = RateLimiterType.API,
    enableContentTypeValidation = true,
  } = options;

  return async (
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> => {
    const startTime = Date.now();
    const requestId = getRequestId(request);
    context.log(`[${requestId}] ${request.method} ${request.url} - Processing started`);

    try {
      // 300+ lines of nested if statements...
      if (request.method === 'OPTIONS' && enableCors) {
        // Handle CORS
      }

      const httpsCheck = enforceHttps(request, context);
      if (httpsCheck) {
        if (enableCors) {
          // Add CORS headers
        }
        return httpsCheck;
      }

      if (enableRateLimit) {
        const rateLimitResult = await checkRateLimit(request, context, rateLimiterType);
        if (!rateLimitResult.allowed && rateLimitResult.response) {
          if (enableCors) {
            // Add CORS headers
          }
          return rateLimitResult.response;
        }
      }

      // ... 250 more lines
    } catch (error) {
      // Error handling
    }
  };
}
```

**AFTER (middleware pipeline - 60 lines, complexity ~5):**

```typescript
// middleware/pipeline.ts
type Middleware = (
  request: Request,
  context: Context,
  next: () => Promise<Response>
) => Promise<Response>;

export function createPipeline(...middlewares: Middleware[]) {
  return async (request: Request, context: Context): Promise<Response> => {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index >= middlewares.length) {
        throw new Error('next() called after final middleware');
      }
      const middleware = middlewares[index++];
      return middleware(request, context, next);
    };

    return next();
  };
}

// middleware/cors.ts
export function corsMiddleware(options: CorsOptions): Middleware {
  return async (request, context, next) => {
    if (request.method === 'OPTIONS') {
      return handlePreflightRequest(request, options);
    }

    const response = await next();
    return addCorsHeaders(response, request, options);
  };
}

// middleware/security.ts
export function httpsMiddleware(): Middleware {
  return async (request, context, next) => {
    if (requiresHttps(request)) {
      return forbiddenResponse('HTTPS required');
    }
    return next();
  };
}

// middleware/rateLimit.ts
export function rateLimitMiddleware(options: RateLimitOptions): Middleware {
  return async (request, context, next) => {
    const allowed = await checkRateLimit(request, context, options);
    if (!allowed) {
      return tooManyRequestsResponse();
    }
    return next();
  };
}

// middleware/auth.ts
export function authMiddleware(options: AuthOptions): Middleware {
  return async (request, context, next) => {
    if (!options.requireAuth) {
      return next();
    }

    const authResult = await authenticate(request, context);
    if (!authResult.success) {
      return unauthorizedResponse(authResult.error);
    }

    request.auth = authResult.auth;
    return next();
  };
}

// endpointWrapper.ts (simplified)
export function wrapEndpoint(
  handler: EndpointHandler,
  options: EndpointOptions = {}
): AzureFunctionHandler {
  const pipeline = createPipeline(
    requestIdMiddleware(),
    corsMiddleware({ enabled: options.enableCors }),
    httpsMiddleware(),
    rateLimitMiddleware({ enabled: options.enableRateLimit }),
    contentTypeMiddleware({ enabled: options.enableContentTypeValidation }),
    authMiddleware({ requireAuth: options.requireAuth }),
    authorizationMiddleware({
      roles: options.requiredRoles,
      permissions: options.requiredPermissions
    }),
    csrfMiddleware(),
    securityHeadersMiddleware()
  );

  return async (request: HttpRequest, context: InvocationContext) => {
    const adaptedRequest = adaptRequest(request);
    const adaptedContext = adaptContext(context);

    try {
      return await pipeline(adaptedRequest, adaptedContext);
    } catch (error) {
      return handleError(error, context, getRequestId(request));
    }
  };
}
```

**Benefits:**
- Each middleware <20 lines, complexity <5
- Easy to test each middleware independently
- Easy to reorder or remove middleware
- Clear separation of concerns
- Reusable middleware across different endpoints

---

## Summary

### By the Numbers

**Current State:**
- Files >100 lines: 50+
- Functions >15 lines: 80%
- Cyclomatic complexity >5: 30+
- Duplicate code: ~800-1000 lines
- Parameter count >4: 15+
- Test coverage: <10%
- Code smells: 100+

**Target State (After Refactoring):**
- Files >100 lines: <10
- Functions >15 lines: <20%
- Cyclomatic complexity >5: 0
- Duplicate code: <100 lines
- Parameter count >4: 0
- Test coverage: 80%
- Code smells: <10

### Health Score by Principle

1. **Write Short Units:** 2/10 ❌ (many violations)
2. **Write Simple Units:** 3/10 ❌ (high complexity)
3. **Write Code Once:** 4/10 ⚠️ (significant duplication)
4. **Small Interfaces:** 6/10 ⚠️ (some violations)
5. **Separate Concerns:** 3/10 ❌ (large files, mixed concerns)
6. **Loose Coupling:** 5/10 ⚠️ (tight platform coupling)
7. **Balance Size:** 4/10 ⚠️ (large imbalance)
8. **Small Codebase:** 7/10 ✅ (some dead code, but aware)
9. **Automate Tests:** 2/10 ❌ (minimal coverage)
10. **Clean Code:** 6/10 ⚠️ (moderate smells)

**Average:** 4.2/10

### Critical Takeaways

**Strengths:**
- ✅ Good security foundations (JWT, RBAC, CSRF, rate limiting)
- ✅ Awareness of quality (recent cleanup, existing utilities)
- ✅ Consistent patterns emerging (new files follow better practices)
- ✅ Good infrastructure (TypeScript, Mantine, Vite, Playwright configured)

**Critical Issues:**
- ❌ No automated tests for API (0% coverage)
- ❌ Large files violating SRP (500-1100 lines)
- ❌ High complexity in critical middleware (~20 branch points)
- ❌ Significant code duplication (~800 lines)

**Recommended First Steps:**
1. Implement quick wins (8 hours, immediate impact)
2. Set up API testing framework (16 hours)
3. Refactor `endpointWrapper.ts` (8 hours, affects all endpoints)
4. Create repository pattern (12 hours, eliminates duplication)
5. Split `MemberDetailView.tsx` (12 hours, improves frontend maintainability)

**Long-term Goal:**
Transform codebase from 4.2/10 to 8.5/10 over 17 weeks (270 hours), achieving:
- 80% test coverage
- All files <300 lines
- All functions <50 lines
- Complexity <10 everywhere
- Minimal duplication
- Clean, maintainable architecture

---

**End of Report**

*This review identifies issues and provides actionable recommendations. Implementation should be prioritized based on team capacity and business needs. Focus on quick wins first, then tackle architectural improvements incrementally.*
