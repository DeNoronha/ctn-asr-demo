# Azure Functions to Container Apps Migration - Gaps Audit

**Date:** November 22, 2025
**Audit Scope:** 70 legacy Azure Functions
**Current Implementation:** Container Apps (api/src/routes.ts)

## Executive Summary

The migration from Azure Functions to Azure Container Apps is **approximately 80% complete** for basic functionality, but **critical BDI (Business Data Interchange) features are missing**.

**Risk Level:** 🔴 **HIGH** - Missing functionality affects inter-system communication and external integrations.

## Migration Status by Category

### ✅ FULLY MIGRATED (Basic CRUD - 100%)

1. **Members Management**
   - GET /v1/members
   - GET /v1/members/:id
   - POST /v1/members (registration)
   - PUT /v1/members/:id
   - DELETE /v1/members/:id

2. **Legal Entities**
   - GET /v1/legal-entities
   - GET /v1/legal-entities/:id
   - PUT /v1/legal-entities/:id

3. **Contacts**
   - GET /v1/legal-entities/:id/contacts
   - POST /v1/legal-entities/:id/contacts
   - PUT /v1/contacts/:id
   - DELETE /v1/contacts/:id

4. **Identifiers**
   - GET /v1/legal-entities/:id/identifiers
   - POST /v1/legal-entities/:id/identifiers (simplified)
   - PUT /v1/identifiers/:id
   - DELETE /v1/identifiers/:id

5. **Endpoints**
   - GET /v1/legal-entities/:id/endpoints
   - POST /v1/legal-entities/:id/endpoints
   - PUT /v1/endpoints/:id
   - DELETE /v1/endpoints/:id

6. **Applications**
   - GET /v1/applications
   - GET /v1/applications/:id
   - POST /v1/applications/:id/approve
   - POST /v1/applications/:id/reject
   - PUT /v1/applications/:id

7. **Admin Tasks**
   - GET /v1/admin/tasks
   - POST /v1/admin/tasks
   - PUT /v1/admin/tasks/:id
   - GET /v1/admin/tasks/:id/history

8. **Audit Logs**
   - GET /v1/audit-logs
   - POST /v1/audit-logs (automatic in middleware)

9. **Document Verification** ✅ JUST COMPLETED (Nov 22, 2025)
   - POST /v1/legal-entities/:id/kvk-document (with automatic verification)
   - POST /v1/legal-entities/:id/kvk-document/verify (manual trigger)
   - Automatic EUID creation
   - Automatic LEI enrichment from GLEIF

---

## 🔴 CRITICAL - NOT MIGRATED

### 1. BDI Token System (BVAD/BVOD)

**Impact:** External systems cannot authenticate or communicate with CTN network

**Missing Functions:**
- `bdiJwks.ts` - JWKS discovery endpoint for token validation
- `generateBvad.ts` - Business Validation & Authorization Descriptor token generation
- `validateBvod.ts` - Business Validation on Demand token validation

**Legacy Implementation:**
- Lines 1-120 in `bdiJwks.ts`: RSA key generation, JWKS endpoint
- Lines 1-250 in `generateBvad.ts`: JWT signing, token issuance
- Lines 1-180 in `validateBvod.ts`: Token validation, authorization logging

**Database Tables Used:**
- `bvad_issued_tokens` - Token tracking
- `bvod_validation_log` - Validation audit trail
- `endpoint_authorization` - Token-to-endpoint authorization

**Required Endpoints:**
- `GET /.well-known/jwks.json` - JWKS discovery
- `POST /api/v1/bdi/tokens/generate` - BVAD generation
- `POST /api/v1/bdi/tokens/validate` - BVOD validation

**Priority:** 🔴 **CRITICAL**
**Estimated Effort:** 2-3 days
**Dependencies:** BDI JWT Service (already exists in `api/src/services/bdiJwtService.ts`)

---

### 2. Party Resolution

**Impact:** Orchestrator Portal cannot resolve party identifiers

**Missing Function:** `ResolveParty.ts`

**Legacy Implementation:**
- Lines 1-150: Multi-registry lookup (KvK, LEI, EUID, DUNS)
- Returns party_reference_id and legal_entity_id
- Caches results for performance

**Required Endpoint:**
- `GET /api/v1/parties/resolve?identifier={value}&type={KVK|LEI|EUID}`

**Priority:** 🟡 **HIGH**
**Estimated Effort:** 1 day
**Dependencies:** None (can use existing identifier queries)

---

### 3. LEI/EUID Generation Endpoints

**Impact:** Manual identifier creation not available (automatic works now)

**Missing Functions:**
- `GenerateLeiFromKvk.ts` - Manual LEI lookup
- `CreateEuidFromKvk.ts` - Manual EUID creation
- `CreateIdentifierSimple.ts` - Legacy identifier creation

**Status:**
- ✅ Automatic generation works (integrated into KvK verification)
- ❌ Manual API endpoints don't exist
- ⚠️ Frontend may expect manual endpoints

**Required Endpoints:**
- `POST /api/v1/identifiers/generate-lei` - Manual LEI lookup
- `POST /api/v1/identifiers/generate-euid` - Manual EUID creation

**Priority:** 🟢 **MEDIUM**
**Estimated Effort:** 1 day
**Dependencies:** leiService.ts, euidService.ts (already exist)

---

## ⚠️ PARTIALLY MIGRATED

### 1. Endpoint Registration Workflow

**Status:** ⚠️ Simplified version exists, verification workflow missing

**What's Migrated:**
- Basic CRUD for endpoints table
- Endpoint creation/update/delete

**What's Missing:**
- `EndpointRegistrationWorkflow.ts` (lines 1-300):
  - DNS verification challenge generation
  - Endpoint connectivity testing
  - Certificate validation
  - Multi-step approval workflow

**Current Workaround:** Endpoints created directly without verification

**Priority:** 🟡 **HIGH** (security risk - unverified endpoints)
**Estimated Effort:** 2 days

---

### 2. Email Notifications

**Status:** ❌ Not migrated (Event Grid integration missing)

**Missing Function:** `EventGridHandler.ts`

**Impact:**
- No email notifications for application approval
- No verification status change notifications
- No admin task assignments

**Legacy Implementation:**
- Lines 1-200: Event Grid triggers
- Email templates in `src/templates/`
- SendGrid integration

**Workaround:** Manual email or no notifications

**Priority:** 🟢 **MEDIUM**
**Estimated Effort:** 1-2 days

---

## ✅ RECENTLY FIXED (November 2025)

### 1. KvK Document Verification
**Discovered:** November 22, 2025
**Fixed:** November 22, 2025 (Build 20251122.5)
**Issue:** Legacy Azure Functions contained complete automatic verification logic that was never migrated
**Resolution:** Migrated complete pipeline including Document Intelligence, KvK API validation, EUID creation, and LEI enrichment

### 2. Missing Member Records
**Discovered:** November 21, 2025
**Fixed:** November 21, 2025 (Migration 032)
**Issue:** 8 legal entities had no member records (approval transaction incomplete)
**Resolution:** Created `/v1/admin/fix-missing-members` endpoint + migration

---

## Migration Completeness by Feature

| Feature Category | Completeness | Critical Missing |
|-----------------|--------------|------------------|
| Basic CRUD | 100% ✅ | None |
| Authentication | 100% ✅ | None |
| Document Verification | 100% ✅ | None (just fixed) |
| Member Management | 100% ✅ | None |
| BDI Token System | 0% ❌ | BVAD/BVOD/JWKS |
| Party Resolution | 0% ❌ | ResolveParty endpoint |
| Endpoint Verification | 30% ⚠️ | DNS verification workflow |
| Email Notifications | 0% ❌ | Event Grid integration |
| Manual Identifier APIs | 50% ⚠️ | LEI/EUID generation endpoints |

---

## Recommended Implementation Priority

### Phase 1: Critical BDI Functionality (Week 1)
1. **BDI JWKS Endpoint** - Required for external system trust
2. **BVAD Generation** - Token issuance for authenticated parties
3. **BVOD Validation** - Token validation and authorization
4. **Party Resolution** - Orchestrator portal dependency

**Estimated Effort:** 4-5 days
**Risk if not implemented:** External systems cannot communicate with CTN network

### Phase 2: Security & Verification (Week 2)
1. **Endpoint Verification Workflow** - DNS challenge, connectivity testing
2. **Manual Identifier Generation APIs** - LEI/EUID manual creation

**Estimated Effort:** 3 days
**Risk if not implemented:** Unverified endpoints create security vulnerabilities

### Phase 3: User Experience (Week 3)
1. **Email Notifications** - Event Grid integration
2. **Batch re-verification** - Process historical documents

**Estimated Effort:** 2-3 days
**Risk if not implemented:** Poor user experience, manual workarounds needed

---

## Testing Strategy

### Before Implementation
- [x] Audit all 70 legacy functions
- [x] Identify critical vs. nice-to-have
- [x] Document database dependencies
- [ ] Create test cases for each missing feature

### During Implementation
- [ ] Create API tests first (curl scripts)
- [ ] Test each endpoint in isolation
- [ ] Integration testing with external systems
- [ ] Load testing for token generation

### After Implementation
- [ ] E2E Playwright tests
- [ ] Security scan (Aikido)
- [ ] Performance benchmarks
- [ ] Documentation updates

---

## Files Referenced in This Audit

**Legacy Functions:**
- `/api/src/functions-legacy-archive/functions-legacy/*.ts` (70 files)

**Current Implementation:**
- `/api/src/routes.ts` (3,400+ lines)
- `/api/src/services/bdiJwtService.ts`
- `/api/src/services/leiService.ts`
- `/api/src/services/euidService.ts`
- `/api/src/services/kvkService.ts`
- `/api/src/services/documentIntelligenceService.ts`

**Database Schema:**
- `/database/asr_dev.sql` (32 tables, 7 views)

---

## Lessons Learned

1. **Migration is not just endpoint mapping** - Business logic within functions must be migrated too
2. **Service extraction helps** - Moving logic to services (leiService, kvkService) made re-integration easier
3. **Test with external systems** - BDI functionality wasn't tested with Orchestrator Portal, so gaps weren't caught
4. **Database schema is critical** - Tables for BDI features exist but endpoints don't use them
5. **Audit early and often** - This should have been done immediately after Container Apps migration

---

## Next Steps

1. **Immediate:** Review this audit with stakeholders
2. **This Week:** Implement Phase 1 (Critical BDI functionality)
3. **Next Week:** Implement Phase 2 (Security & verification)
4. **Week 3:** Implement Phase 3 (User experience)
5. **Ongoing:** Create comprehensive test suite

---

**Document Owner:** Claude Code
**Last Updated:** November 22, 2025
**Next Review:** After Phase 1 implementation
