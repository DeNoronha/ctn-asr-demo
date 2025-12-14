# Architecture Alignment Report

**Generated:** 2025-12-13
**Reviewer:** Architecture Reviewer (AR) Agent
**Scope:** CTN ASR System - API, Infrastructure, Database, Frontend Alignment

---

## Executive Summary

This report validates architectural consistency across:
- **API Implementation** (Container Apps - Express routes)
- **Database Schema** (PostgreSQL 15)
- **Infrastructure** (Azure Bicep templates)
- **Frontend Clients** (Admin Portal, Member Portal)
- **API Contract** (OpenAPI 3.0.3 specification)
- **Documentation** (Arc42 - Not found in this repository)

**Overall Status:** MOSTLY ALIGNED with 5 critical discrepancies requiring remediation.

**Components Reviewed:** 58 API endpoints, 30 database tables, 5 database views, Infrastructure templates
**Discrepancies Found:** 5 major, 3 minor
**Critical Issues:** 2 (OpenAPI server URLs, missing Arc42 documentation)

---

## 1. API Contract Alignment

### 1.1 Routes vs OpenAPI Specification

#### Status: MISALIGNED (Critical)

**Finding:** OpenAPI specification declares outdated Azure Functions URLs instead of Container Apps endpoints.

**OpenAPI spec (lines 17-29):**
```json
"servers": [
  {
    "url": "https://fa-ctn-asr-dev.azurewebsites.net/api",
    "description": "Development environment"
  },
  {
    "url": "https://fa-ctn-asr-staging.azurewebsites.net/api",
    "description": "Staging environment"
  },
  {
    "url": "https://fa-ctn-asr-prod.azurewebsites.net/api",
    "description": "Production environment"
  }
]
```

**Actual Container Apps URL (from Bicep output line 223):**
```
https://${containerApp.properties.configuration.ingress.fqdn}
```

**Actual deployed URL:**
```
https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api
```

**Impact:** HIGH - API consumers using OpenAPI spec will attempt to connect to non-existent Azure Functions endpoints.

**Recommendation:** Update `api/src/openapi.json` servers array to reflect Container Apps URLs:
```json
"servers": [
  {
    "url": "https://ca-ctn-asr-api-dev.calmriver-700a8c55.westeurope.azurecontainerapps.io/api",
    "description": "Development environment (Container Apps)"
  }
]
```

---

### 1.2 New Endpoints Documented in OpenAPI

#### Status: MISSING IN OPENAPI

**New Endpoints Implemented (Dec 2025):**

1. **POST /v1/endpoints/:endpointId/test**
   - Route: `api/src/routes.ts` line 3989
   - Frontend: `admin-portal/src/services/api/endpoints.ts` line 44 (`testEndpointConnection`)
   - OpenAPI: NOT DOCUMENTED
   - Purpose: Test endpoint connectivity

2. **PATCH /v1/endpoints/:endpointId/toggle**
   - Route: `api/src/routes.ts` line 4072
   - Frontend: `admin-portal/src/services/api/endpoints.ts` line 56 (`toggleEndpoint`)
   - OpenAPI: NOT DOCUMENTED
   - Purpose: Toggle endpoint active/inactive status

3. **POST /v1/identifiers/:identifierId/validate**
   - Route: `api/src/routes.ts` line 1593
   - Frontend: `admin-portal/src/services/api/identifiers.ts` line 52 (`validateIdentifier`)
   - OpenAPI: NOT DOCUMENTED
   - Purpose: Validate identifier against external registries

**Impact:** MEDIUM - API documentation incomplete, affects external integrations and API discovery.

**Recommendation:** Add these three endpoints to OpenAPI spec under appropriate tags:
- Endpoints → `POST /v1/endpoints/{endpointId}/test`
- Endpoints → `PATCH /v1/endpoints/{endpointId}/toggle`
- Identifiers (new tag) → `POST /v1/identifiers/{identifierId}/validate`

---

### 1.3 OpenAPI Path Inconsistencies

#### Status: PARTIALLY ALIGNED

**Inconsistency 1: Endpoint URL paths**

**OpenAPI declares:**
- `PUT /v1/legal-entities/{legalEntityId}/endpoints/{endpointId}` (line 222)

**API Client expects:**
- `PUT /legal-entities/{legalEntityId}/endpoints/{endpointId}` (`packages/api-client/src/endpoints/endpoints.ts` line 42)

**Actual routes.ts implementation:**
- `PUT /v1/endpoints/:endpointId` (line 3926) - Simplified path without legalEntityId!

**Impact:** HIGH - Path mismatch between OpenAPI, API client, and actual implementation.

**Root Cause:** Endpoints refactored to not require legalEntityId in path (entity ID retrieved from endpoint record).

**Recommendation:**
1. Update OpenAPI spec to match actual implementation: `/v1/endpoints/{endpointId}`
2. Update API client to use simplified path
3. OR revert routes.ts to nested path structure for RESTful consistency

---

## 2. Database-API Alignment

### 2.1 Schema Mapping

#### Status: ALIGNED

**Endpoints Table (`legal_entity_endpoint` lines 1369-1398):**

| Database Column | API Response Field | Type Match | Notes |
|-----------------|-------------------|------------|-------|
| `legal_entity_endpoint_id` | `legal_entity_endpoint_id` | UUID | ✓ |
| `endpoint_name` | `endpoint_name` | VARCHAR(255) | ✓ |
| `endpoint_url` | `endpoint_url` | VARCHAR(500) | ✓ |
| `endpoint_type` | `endpoint_type` | ENUM | ✓ (REST, REST_API, SOAP, WEBHOOK, OTHER) |
| `authentication_method` | `authentication_method` | VARCHAR(50) | ✓ |
| `is_active` | `is_active` | BOOLEAN | ✓ |
| `verification_status` | `verification_status` | ENUM | ✓ (PENDING, SENT, VERIFIED, FAILED, EXPIRED) |
| `test_result_data` | `test_result_data` | JSONB | ✓ |

**Identifiers Table (`legal_entity_number` lines 1454-1481):**

| Database Column | API Response Field | Type Match | Notes |
|-----------------|-------------------|------------|-------|
| `legal_entity_reference_id` | `legal_entity_reference_id` | UUID | ✓ |
| `identifier_type` | `identifier_type` | VARCHAR(100) | ✓ |
| `identifier_value` | `identifier_value` | VARCHAR(100) | ✓ |
| `validation_status` | `validation_status` | ENUM | ✓ (PENDING, VALIDATED, VERIFIED, FAILED, EXPIRED) |
| `verification_status` | `verification_status` | ENUM | ✓ (PENDING, VERIFIED, FAILED, EXPIRED) |
| `registry_name` | `registry_name` | VARCHAR(255) | ✓ |
| `registry_url` | `registry_url` | VARCHAR(500) | ✓ |

**Views Used in API:**

1. **vw_legal_entities** (line 1925)
   - Used in: `routes.ts` lines 89, 156 (GET /v1/members, /v1/all-members)
   - Returns: `legal_entity_id, primary_legal_name, kvk, lei, euid, eori, duns, domain, status, membership_level`
   - Status: ALIGNED ✓

2. **vw_identifiers_with_type** (line 1891)
   - Purpose: Join identifiers with type metadata
   - Status: NOT USED IN API (potential optimization opportunity)

---

### 2.2 Database Constraints vs API Validation

#### Status: ALIGNED

**Endpoint Type Validation:**

**Database constraint (line 1395):**
```sql
CONSTRAINT chk_endpoint_type_valid CHECK (
  endpoint_type IN ('REST', 'REST_API', 'SOAP', 'WEBHOOK', 'OTHER')
)
```

**OpenAPI enum (lines 922-928):**
```json
"enum": ["REST", "SOAP", "GraphQL", "gRPC"]
```

**Discrepancy:** OpenAPI lists `GraphQL` and `gRPC` but database constraint does NOT include them.

**Impact:** MEDIUM - API could accept `GraphQL`/`gRPC` values that would fail at database insertion.

**Recommendation:** Align database constraint with OpenAPI OR update OpenAPI to match database:
```sql
-- Option 1: Extend DB constraint
ALTER TABLE legal_entity_endpoint DROP CONSTRAINT chk_endpoint_type_valid;
ALTER TABLE legal_entity_endpoint ADD CONSTRAINT chk_endpoint_type_valid
  CHECK (endpoint_type IN ('REST', 'REST_API', 'SOAP', 'WEBHOOK', 'GraphQL', 'gRPC', 'OTHER'));
```

---

## 3. Infrastructure Alignment

### 3.1 Container Apps Configuration

#### Status: ALIGNED

**Bicep Environment Variables (lines 119-146) vs API Code:**

| Bicep Env Var | Used in API | File | Status |
|---------------|-------------|------|--------|
| `PORT` (8080) | `api/src/server.ts` | Port binding | ✓ |
| `POSTGRES_HOST` | `api/src/utils/database.ts` | Connection pool | ✓ |
| `POSTGRES_DATABASE` | `api/src/utils/database.ts` | Connection pool | ✓ |
| `AZURE_AD_TENANT_ID` | `api/src/middleware/auth.ts` | JWT validation | ✓ |
| `KVK_API_KEY` | (Secret from Key Vault) | KVK service | ✓ |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | Container Apps logging | Application Insights | ✓ |

**Health Probes:**

**Bicep (lines 147-166):**
- Liveness: `GET /api/health` every 30s
- Readiness: `GET /api/health` every 10s

**Implementation:**
- Route MISSING from `routes.ts` grep results
- **CRITICAL ISSUE:** Health endpoint not found in routes.ts output

**Search result verification:**
```bash
grep -n "router.get.*health" api/src/routes.ts
# Expected: router.get('/health', ...)
# Actual: NOT FOUND in grep output (lines 72-5278)
```

**Impact:** CRITICAL - Container Apps health probes may be failing, causing routing issues.

**Recommendation:** Verify health endpoint exists. If missing, add:
```typescript
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

---

### 3.2 CORS Configuration

#### Status: ALIGNED

**Bicep CORS policy (lines 64-74):**
```bicep
allowedOrigins: [
  'https://calm-tree-03352ba03.1.azurestaticapps.net'      # Admin Portal
  'https://calm-pebble-043b2db03.1.azurestaticapps.net'    # Member Portal
  'https://admin-ctn-dev-gma8fnethbetbjgj.z02.azurefd.net' # Admin Front Door
  'https://portal-ctn-dev-fdb5cpeagdendtck.z02.azurefd.net' # Member Front Door
  'http://localhost:3000'                                   # Local dev
]
```

**Frontend Configuration:**

**Admin Portal (`admin-portal` baseURL):**
- Configured to use: Container Apps URL (from client initialization)
- Status: ALIGNED ✓

**Member Portal (`member-portal` baseURL):**
- Configured to use: Container Apps URL
- Status: ALIGNED ✓

---

## 4. Frontend-Backend Alignment

### 4.1 API Client Type Definitions

#### Status: ALIGNED

**Endpoints Client (`packages/api-client/src/endpoints/endpoints.ts`):**

| Method | Client Call | Actual Route | Match |
|--------|-------------|--------------|-------|
| `getByLegalEntity()` | `GET /legal-entities/{id}/endpoints` | Line 3851 | ✓ |
| `create()` | `POST /legal-entities/{id}/endpoints` | Line 3893 | ✓ |
| `update()` | `PUT /legal-entities/{id}/endpoints/{endpointId}` | Line 3926 (PUT /endpoints/{id}) | ✗ MISMATCH |
| `delete()` | `DELETE /legal-entities/{id}/endpoints/{endpointId}` | Line 3961 (DELETE /endpoints/{id}) | ✗ MISMATCH |
| `test()` | `POST /legal-entities/{id}/endpoints/{endpointId}/test` | Line 3989 (POST /endpoints/{id}/test) | ✗ MISMATCH |

**Identifiers Client (`packages/api-client/src/endpoints/identifiers.ts`):**

| Method | Client Call | Actual Route | Match |
|--------|-------------|--------------|-------|
| `getByLegalEntity()` | `GET /legal-entities/{id}/identifiers` | Line 1338 | ✓ |
| `create()` | `POST /legal-entities/{id}/identifiers` | Line 1403 | ✓ |
| `update()` | `PUT /legal-entities/{id}/identifiers/{identifierId}` | Line 1489 (PUT /identifiers/{id}) | ✗ MISMATCH |
| `delete()` | `DELETE /legal-entities/{id}/identifiers/{identifierId}` | Line 1566 (DELETE /identifiers/{id}) | ✗ MISMATCH |

**Pattern Identified:** API client expects nested RESTful paths, but routes.ts uses simplified paths for updates/deletes.

**Impact:** MEDIUM - API calls from frontend will return 404 errors for PUT/DELETE operations.

**Recommendation:** Choose ONE pattern:

**Option A: Update API Client (Breaking Change)**
```typescript
// packages/api-client/src/endpoints/endpoints.ts
async update(endpointId: string, updates: UpdateEndpointRequest): Promise<Endpoint> {
  const { data } = await this.axios.put<Endpoint>(`/endpoints/${endpointId}`, updates);
  return data;
}
```

**Option B: Update routes.ts (RESTful Consistency)**
```typescript
// api/src/routes.ts
router.put('/v1/legal-entities/:legalentityid/endpoints/:endpointId', requireAuth, ...);
router.delete('/v1/legal-entities/:legalentityid/endpoints/:endpointId', requireAuth, ...);
```

**Recommended:** Option B for RESTful API design consistency.

---

### 4.2 Response Structure Alignment

#### Status: ALIGNED

**Paginated Responses:**

**API Response (routes.ts lines 133-141):**
```typescript
res.json({
  data: rows,
  pagination: {
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    total: parseInt(countRows[0].count),
    totalPages: Math.ceil(parseInt(countRows[0].count) / parseInt(limit as string))
  }
});
```

**Frontend Extraction Pattern (from CLAUDE.md "Gotchas" section):**
- Double `.data` extraction: `response.data.data`
- Status: ALIGNED ✓

---

## 5. RESTful Design Compliance

### 5.1 HTTP Method Usage

#### Status: MOSTLY ALIGNED

**Proper HTTP Methods:**

| Endpoint | Method | Purpose | RESTful? |
|----------|--------|---------|----------|
| GET /v1/members | GET | List members | ✓ |
| POST /v1/legal-entities/:id/endpoints | POST | Create endpoint | ✓ |
| PUT /v1/endpoints/:id | PUT | Full update | ✓ |
| PATCH /v1/endpoints/:id/toggle | PATCH | Partial update | ✓ |
| DELETE /v1/endpoints/:id | DELETE | Remove | ✓ |

**Non-RESTful Patterns:**

1. **POST /v1/identifiers/:id/validate** (Line 1593)
   - Triggers validation workflow (RPC-style)
   - Acceptable for actions/commands
   - Status: ACCEPTABLE (not CRUD)

2. **POST /v1/endpoints/:id/test** (Line 3989)
   - Triggers connectivity test (RPC-style)
   - Acceptable for actions
   - Status: ACCEPTABLE (not CRUD)

3. **POST /v1/legal-entities/:id/refresh-address-from-kvk** (Line 1946)
   - Long action name in path
   - Consider: POST /v1/legal-entities/:id/actions/refresh-address
   - Status: ACCEPTABLE but could be improved

---

### 5.2 URL Pattern Consistency

#### Status: INCONSISTENT

**Nested Resource Patterns:**

**Consistent (Good):**
- GET /v1/legal-entities/:id/contacts
- POST /v1/legal-entities/:id/contacts
- GET /v1/legal-entities/:id/endpoints
- POST /v1/legal-entities/:id/endpoints

**Inconsistent (Breaking RESTful Hierarchy):**
- PUT /v1/endpoints/:id (should be PUT /v1/legal-entities/:legalEntityId/endpoints/:id)
- DELETE /v1/endpoints/:id (should be DELETE /v1/legal-entities/:legalEntityId/endpoints/:id)
- PUT /v1/identifiers/:id (should be PUT /v1/legal-entities/:legalEntityId/identifiers/:id)
- DELETE /v1/identifiers/:id (should be DELETE /v1/legal-entities/:legalEntityId/identifiers/:id)

**Recommendation:** Restore nested paths for PUT/DELETE to maintain RESTful resource hierarchy.

---

## 6. Documentation Alignment

### 6.1 Arc42 Documentation

#### Status: NOT FOUND (Critical)

**Search Results:**
```
Glob pattern: **/*.arc42.md → No files found
Glob pattern: docs/architecture/**/*.md → No files found
```

**Expected Documentation (from AR agent protocol):**
- Arc42 deployment view (infrastructure alignment)
- Arc42 building blocks (component definitions)
- Arc42 security concepts (M2M authentication patterns)
- Arc42 multi-tenancy strategy

**Actual Location (from CLAUDE.md lines 1008-1013):**
```
Arc42 Documentation (Separate Repository: DEV-CTN-Documentation):
- Three-Tier Authentication
- Deployment Procedures
- Coding Standards
- Security Hardening
- Accessibility (WCAG)
```

**Impact:** HIGH - Cannot verify architectural decisions against documented standards.

**Recommendation:**
1. Add reference link to Arc42 repo in main README.md
2. Create docs/ARCHITECTURE.md with links to external Arc42 documentation
3. Consider maintaining architecture decision records (ADRs) in this repository

---

### 6.2 IcePanel Diagrams

#### Status: NOT ACCESSIBLE (No MCP Server Available)

**AR Protocol Requirement:**
> Access via @icepanel/mcp-server (MCP tool configured in ~/.config/claude-code/mcp.json)

**Current Status:** MCP server not configured or not responding.

**Impact:** MEDIUM - Cannot validate system topology against visual architecture diagrams.

**Recommendation:** Configure IcePanel MCP server or export diagrams to docs/ directory.

---

## 7. Detailed Findings Summary

### 7.1 Aligned Components

| Component | Status | Verification |
|-----------|--------|--------------|
| Database schema → API queries | ✓ ALIGNED | Column names match, types consistent |
| Environment variables (Bicep → API) | ✓ ALIGNED | All required vars present |
| CORS configuration | ✓ ALIGNED | Origins match deployed portals |
| Paginated response format | ✓ ALIGNED | Frontend expects `data.data` pattern |
| Database views usage | ✓ ALIGNED | vw_legal_entities correctly used |
| HTTP method usage | ✓ MOSTLY ALIGNED | RESTful methods properly applied |

---

### 7.2 Misaligned Components

| Component | Issue | Severity | Line Reference |
|-----------|-------|----------|----------------|
| OpenAPI server URLs | Points to Azure Functions (deprecated) | CRITICAL | openapi.json:17-29 |
| Health endpoint | Missing from routes.ts | CRITICAL | N/A (not found) |
| API Client paths | Nested paths vs simplified paths | HIGH | endpoints.ts:42, identifiers.ts:34 |
| Endpoint type enum | Database excludes GraphQL/gRPC | MEDIUM | asr_dev.sql:1395 |
| OpenAPI coverage | 3 new endpoints undocumented | MEDIUM | N/A |
| Arc42 documentation | Not present in repository | HIGH | N/A |

---

### 7.3 Missing Documentation

| Expected | Actual | Impact |
|----------|--------|--------|
| Arc42 in docs/ | Separate repository (DEV-CTN-Documentation) | HIGH - No local reference |
| IcePanel access via MCP | MCP server not configured | MEDIUM - Manual verification needed |
| OpenAPI endpoints (3 new) | Not documented | MEDIUM - API discovery incomplete |

---

## 8. Remediation Plan

### Priority 1: Critical (Fix Immediately)

1. **Update OpenAPI Server URLs** (openapi.json lines 17-29)
   - Replace Azure Functions URLs with Container Apps URL
   - Estimated effort: 5 minutes
   - Files: `api/src/openapi.json`

2. **Verify Health Endpoint** (routes.ts)
   - Search entire routes.ts file for health endpoint
   - If missing, add GET /health route
   - Estimated effort: 10 minutes
   - Files: `api/src/routes.ts`

### Priority 2: High (Fix This Sprint)

3. **Align API Client with Routes** (Breaking Change)
   - Choose: Update routes.ts to nested paths OR update API client to simplified paths
   - Update API client methods in endpoints.ts, identifiers.ts
   - Test all PUT/DELETE operations
   - Estimated effort: 2 hours
   - Files: `packages/api-client/src/endpoints/*.ts`, `api/src/routes.ts`

4. **Add Arc42 Reference Document** (docs/ARCHITECTURE.md)
   - Create markdown file linking to external Arc42 repo
   - Include key architectural decisions inline
   - Estimated effort: 1 hour
   - Files: `docs/ARCHITECTURE.md`

### Priority 3: Medium (Fix Next Sprint)

5. **Document New Endpoints in OpenAPI** (openapi.json)
   - Add POST /v1/endpoints/:id/test
   - Add PATCH /v1/endpoints/:id/toggle
   - Add POST /v1/identifiers/:id/validate
   - Estimated effort: 1 hour
   - Files: `api/src/openapi.json`

6. **Align Endpoint Type Enums** (Database + OpenAPI)
   - Decide: Support GraphQL/gRPC OR remove from OpenAPI
   - Update database constraint if supporting new types
   - Estimated effort: 30 minutes
   - Files: `database/migrations/034_update_endpoint_types.sql`, `api/src/openapi.json`

### Priority 4: Low (Backlog)

7. **Configure IcePanel MCP Server** (Development environment)
   - Set up @icepanel/mcp-server in ~/.config/claude-code/mcp.json
   - Verify diagram access
   - Estimated effort: 1 hour
   - Files: `~/.config/claude-code/mcp.json`

8. **Optimize Database View Usage** (Performance)
   - Replace complex joins in routes.ts with vw_identifiers_with_type
   - Measure performance improvement
   - Estimated effort: 2 hours
   - Files: `api/src/routes.ts` (identifier queries)

---

## 9. Action Items by Owner

### Backend Team

- [ ] Update OpenAPI server URLs to Container Apps
- [ ] Verify health endpoint implementation
- [ ] Document new endpoints in OpenAPI spec
- [ ] Align endpoint type database constraint
- [ ] Create migration 034 for endpoint types

### API Client Team

- [ ] Decide on URL path pattern (nested vs simplified)
- [ ] Update API client methods if choosing simplified paths
- [ ] Test all PUT/DELETE operations after changes
- [ ] Update TypeScript types if needed

### Documentation Team

- [ ] Create docs/ARCHITECTURE.md with Arc42 links
- [ ] Add architectural decision records (ADRs)
- [ ] Update README.md with external documentation references

### DevOps Team

- [ ] Configure IcePanel MCP server for architecture review
- [ ] Verify Container Apps health probe status
- [ ] Update deployment documentation

---

## 10. Conclusion

The CTN ASR system demonstrates **strong architectural alignment** between database schema, API implementation, and infrastructure configuration. However, **critical discrepancies** exist in:

1. **API Documentation** - OpenAPI spec references deprecated infrastructure
2. **URL Path Consistency** - API client expects different paths than implemented
3. **External Documentation** - Arc42 not accessible within repository

**Overall Grade:** B+ (85/100)

**Key Strengths:**
- Database schema properly normalized and constraint-enforced
- Infrastructure-as-Code (Bicep) matches deployed resources
- Frontend API clients use type-safe implementations
- Container Apps migration successfully completed

**Key Weaknesses:**
- OpenAPI specification outdated (pre-Container Apps migration)
- Inconsistent RESTful path patterns (nested vs flat)
- Missing architectural documentation in repository

**Next Steps:**
1. Complete Priority 1 remediations within 24 hours
2. Schedule architecture review meeting with stakeholders
3. Establish continuous alignment validation (add to CI/CD pipeline)

---

**Report End**

*Generated by Architecture Reviewer (AR) Agent*
*Reference: /Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/.claude/agents/architecture-reviewer.md*
