# Task Manager

**Purpose:** Track important tasks, refactoring needs, and technical debt that require attention.

**Last Updated:** November 13, 2025 (Merged tasks from Desktop ROADMAP.md)

---

## 🔴 High Priority

### Security - Secret Rotation (URGENT)

**Status:** Not Started
**Priority:** Critical
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Context:** DG agent found exposed secrets in local.settings.json files during audit

**Tasks:**
- [ ] **SEC-ROTATE-001: Rotate PostgreSQL password** - CRITICAL
  - **Exposed in:** api/local.settings.json (gitignored but exists locally)
  - **Action:** Change in Azure Portal, update Key Vault, update local settings
  - **Timeline:** 30 minutes

- [ ] **SEC-ROTATE-002: Rotate Storage Account keys** - CRITICAL
  - **Exposed in:** api/local.settings.json
  - **Action:** Regenerate keys in Azure Portal, update Function App settings
  - **Timeline:** 20 minutes

- [ ] **SEC-ROTATE-003: Rotate KVK API Key** - HIGH
  - **Exposed in:** api/local.settings.json
  - **Action:** Request new key from KVK, update Key Vault
  - **Timeline:** 1 hour (includes KVK request)

- [ ] **SEC-ROTATE-004: Rotate Anthropic API Key** - HIGH
  - **Exposed in:** booking-portal/api/local.settings.json
  - **Action:** Generate new key in Anthropic Console, update Key Vault
  - **Timeline:** 15 minutes

- [ ] **SEC-ROTATE-005: Rotate Cosmos DB keys (booking portal)** - HIGH
  - **Exposed in:** booking-portal/api/local.settings.json
  - **Action:** Regenerate in Azure Portal, update Function App settings
  - **Timeline:** 20 minutes

---

### Azure Key Vault Migration

**Status:** Not Started
**Priority:** High
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 2-3 hours

**Problem:**
Secrets currently in environment variables, need centralized secure storage.

**Tasks:**
- [ ] Move all secrets to Azure Key Vault
  - PostgreSQL connection strings
  - JWT secrets
  - Azure Storage account keys
  - Event Grid access keys
- [ ] Update Function App configuration to reference Key Vault secrets
- [ ] Create/update .credentials file (not in Git) for local development
- [ ] Store all credentials, URLs, Azure Function info for all 4 portals

**Impact:**
- Security best practice
- Enables centralized secret rotation
- Reduces risk of credential exposure

**Reference:** See docs/SECURITY_AUDIT_REPORT.md for migration instructions

---

### Database Schema Refactoring

**Issue Identified:** November 13, 2025 during Keycloak M2M setup
**Status:** Not Started
**Priority:** High
**Estimated Effort:** 2-3 days

**Problem:**
The current schema has overcomplicated relationships with redundancy between:
- `party_reference` (base entity)
- `legal_entity` (organization details)
- `members` (duplicate/overlapping data?)

**Symptoms:**
- Duplicate `legal_entity` rows for same `party_id` found during M2M credential mapping
- View `v_m2m_credentials_active` returns duplicate rows due to multiple legal_entity records
- Unclear separation of concerns between tables
- Data redundancy causing maintenance issues

**Tasks:**

1. **Invoke DE (Database Expert) Agent for Analysis**
   - [ ] Analyze current schema relationships
   - [ ] Identify duplicate data patterns
   - [ ] Document redundancies and inconsistencies
   - [ ] Recommend normalized schema structure

2. **Remove Duplicate Legal Entities**
   - [ ] Query to find all duplicate legal_entity records per party_id
   - [ ] Create cleanup script to remove duplicates (keeping most recent)
   - [ ] Add UNIQUE constraint: `(party_id) WHERE is_deleted = false`
   - [ ] Update views to handle edge cases

3. **Schema Simplification Proposal**
   - [ ] Evaluate if `members` table is still needed
   - [ ] Determine proper relationship: party_reference → legal_entity
   - [ ] Identify which columns are truly needed vs redundant
   - [ ] Design migration path with zero downtime

4. **Implementation Plan**
   - [ ] Create migration scripts (with rollback)
   - [ ] Test in development environment
   - [ ] Update all API queries and views
   - [ ] Update Keycloak middleware (resolvePartyIdFromKeycloak)
   - [ ] Deploy to production

**Impact:**
- **Medium Risk:** Changes affect core data model
- **High Reward:** Cleaner schema, fewer bugs, easier maintenance
- **Breaking Changes:** Potentially affects all party/entity queries

**Related Files:**
- `database/current_schema.sql`
- `database/migrations/026-rename-zitadel-to-generic-m2m-fixed-v2.sql` (view definition)
- `api/src/middleware/keycloak-auth.ts` (party resolution)

**Notes:**
- Current workaround: View uses `LEFT JOIN legal_entity ... AND le.is_deleted = false`
- This masks the underlying duplicate issue but doesn't fix it
- Need proper UNIQUE constraints to prevent future duplicates

---

## 🟡 Medium Priority

### Admin Portal - Testing & Quality Assurance

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**

#### Improve Authentication Test Coverage
- [ ] Fix test expecting login flow (design issue)
- [ ] Investigate API request timeouts
- [ ] Fix admin feature visibility checks
- **Impact:** Tests don't accurately reflect production behavior
- **Timeline:** 2 hours
- **Priority:** P1 - HIGH (Next Sprint)

#### Investigate KvK Identifier Bug
- [ ] Debug why tests cannot find identifier UI elements
- [ ] Verify endpoint URLs are correct
- **Impact:** Known production bug affecting user workflows
- **Timeline:** 4 hours
- **Priority:** P2 - MEDIUM (Backlog)

---

### BDI Production Setup

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 5.5 hours

**Tasks:**
- [ ] **Configure BDI RSA keys in Key Vault**
  - **Keys:** BDI_PRIVATE_KEY, BDI_PUBLIC_KEY
  - **Timeline:** 30 minutes

- [ ] **Set BDI_KEY_ID in Function App Settings**
  - **Timeline:** 15 minutes

- [ ] **Test BVAD generation with international companies**
  - **Timeline:** 1 hour

- [ ] **Test BVOD validation with sample orchestrations**
  - **Timeline:** 1 hour

- [ ] **Register external BDI systems**
  - **Action:** Register DHL, Maersk, etc. in `bdi_external_systems` table
  - **Timeline:** 2 hours

- [ ] **BDI token generation and validation E2E testing**
  - **Note:** Member portal is now stable and production-ready, can focus on BDI testing
  - **Timeline:** 4 hours

---

### API Development

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**
- [ ] **Define API versioning strategy**
  - **Timeline:** 2 hours

- [ ] **SEC-API-001: API keys visible in network requests**
  - Move to secure backend proxy
  - **Location:** Currently none, but needed for future integrations
  - **Timeline:** 2 hours
  - **Priority:** P0 - Address before production release

---

### Monitoring & Observability

**Status:** Not Started
**Priority:** Medium
**Source:** Desktop ROADMAP.md (November 10, 2025)
**Estimated Effort:** 12 hours

**Tasks:**
- [ ] **Configure Application Insights telemetry**
  - **Action:** Set up detailed metrics
  - **Timeline:** 2 hours

- [ ] **Set up alerting rules**
  - **Action:** Configure alerts for failed requests, slow queries, errors
  - **Timeline:** 2 hours

- [ ] **Create operational dashboard**
  - **Action:** Build dashboard in Azure Monitor
  - **Timeline:** 3 hours

- [ ] **Configure Alert Action Groups**
  - **Action:** Add email/SMS notifications for alerts
  - **Timeline:** 1 hour

- [ ] **Instrument Remaining API Functions**
  - **Action:** Add telemetry to 30+ additional functions
  - **Timeline:** 4 hours

---

### Add Database Constraints for Data Integrity

**Status:** Not Started
**Priority:** Medium

**Tasks:**
- [ ] Add UNIQUE constraint on `legal_entity(party_id)` WHERE is_deleted = false
- [ ] Add CHECK constraint to prevent NULL in critical fields
- [ ] Review all foreign key constraints for CASCADE vs RESTRICT
- [ ] Add partial indexes for soft-deleted records

---

## 🟢 Low Priority / Future Enhancements

### Architecture & Infrastructure Improvements

**Status:** Not Started
**Priority:** Low
**Source:** Desktop ROADMAP.md (November 10, 2025)

**Tasks:**

#### Create Shared API Client Package
- [ ] **Issue:** All 3 React portals implement their own axios wrapper and auth logic
- [ ] **Solution:** Create @ctn/api-client NPM package with shared services
- [ ] **Benefits:** Single source of truth, consistent error handling, easier maintenance
- [ ] **Reference:** Code Reviewer finding #5

#### Set Up Proper Production Environment
- [ ] **Issue:** Using "dev" naming convention
- [ ] **Current:** `func-ctn-demo-asr-dev.azurewebsites.net`
- [ ] **Recommended:** `fa-ctn-asr-{env}.azurewebsites.net` (dev/staging/prod)
- [ ] **WARNING:** Requires new Function App deployment + DNS updates (breaking change)

#### Implement Keycloak as Self-Hosted IdP
- [ ] **Action:** Deploy Keycloak in CTN Azure environment for member endpoint token generation
- [ ] **Configure Keycloak realm for BDI** (if using external Keycloak)
  - Documentation needed

#### Add Metadata Headers to All Documentation Files
- [ ] **Issue:** Files have stable names but no "Last Updated" metadata at document top
- [ ] **Solution:** Add structured metadata headers (Last Updated, Status, Version) to all markdown files
- [ ] **Scope:** Apply to all 66+ documentation files
- [ ] **Timeline:** 4-6 hours (52+ files)
- [ ] **Priority:** LOW - Time-consuming, low-impact task

---

### Keycloak M2M Authentication - Production Readiness

**Status:** ✅ Core Implementation Complete (November 13, 2025)

**Completed:**
- ✅ Database migration to generic M2M naming (migration 026)
- ✅ Keycloak middleware created (`keycloak-auth.ts`)
- ✅ Cloud IAM instance configured (France, EU)
- ✅ Test service account mapped to database
- ✅ Azure Functions environment variables configured
- ✅ API functions updated to use Keycloak middleware
- ✅ Deployed and tested end-to-end (all M2M endpoints working)
- ✅ Documentation created (`docs/KEYCLOAK_M2M_AUTHENTICATION.md`)
- ✅ Removed Zitadel remnants

**Remaining Production Tasks:**
- [ ] Create additional service accounts for production partners
- [ ] Implement per-client rate limiting (Azure APIM or custom middleware)
- [ ] Set up monitoring dashboard for M2M usage metrics
- [ ] Configure alerting for failed authentication attempts
- [ ] Implement secret rotation policy (90-day cycle)
- [ ] Create partner onboarding documentation/portal
- [ ] Load testing with concurrent M2M requests (TE agent)

---

## 📋 Backlog

### Documentation
- [x] Update API documentation with Keycloak authentication examples
- [x] Create partner onboarding guide for M2M access (`docs/KEYCLOAK_M2M_AUTHENTICATION.md`)
- [ ] Document schema relationships in Arc42 format
- [ ] Create visual architecture diagrams (Mermaid) for M2M flow

### Testing
- [ ] Add unit tests for Keycloak middleware (Vitest)
- [ ] Create integration tests for M2M authentication flows (Playwright)
- [ ] Load test M2M endpoints with concurrent requests
- [ ] Add negative test cases (expired tokens, invalid scopes, etc.)

### Security
- [ ] Implement rate limiting per M2M client (Azure APIM or custom middleware)
- [ ] Add monitoring/alerting for failed authentication attempts
- [ ] Regular secret rotation policy for service accounts (90-day cycle)
- [ ] Security audit of Keycloak configuration (SA agent)
- [ ] Penetration testing of M2M endpoints

---

## 🔧 How to Use This File

1. **Adding Tasks:**
   - Use clear, actionable task descriptions
   - Include priority, status, and estimated effort
   - Link to relevant files and documentation

2. **Updating Status:**
   - Change checkboxes from `[ ]` to `[x]` when complete
   - Update "Last Updated" date at top
   - Move completed tasks to COMPLETED_ACTIONS.md

3. **Invoking Agents:**
   - **DE (Database Expert):** Schema analysis, migrations, performance
   - **SA (Security Analyst):** Security reviews, vulnerability scanning
   - **CR (Code Reviewer):** Code quality, best practices
   - **TE (Test Engineer):** Test creation, E2E testing

---

## 🎯 Next Actions

**Immediate (This Week):**
1. **CRITICAL:** Execute secret rotation tasks (SEC-ROTATE-001 through SEC-ROTATE-005)
2. Complete Azure Key Vault migration (2-3 hours)
3. Invoke DE (Database Expert) agent to analyze schema redundancy
4. Create duplicate legal_entity cleanup script

**Short Term (Next 2 Weeks):**
1. Fix duplicate legal_entity records issue
2. Add UNIQUE constraint on legal_entity(party_id)
3. Configure BDI production setup (RSA keys, testing)
4. Improve Admin Portal authentication test coverage
5. Set up monitoring & observability (Application Insights, alerts, dashboard)

**Long Term (Next Month):**
1. Design and implement schema simplification (party/legal_entity/members)
2. Complete BDI E2E testing and external system registration
3. Investigate and fix KvK identifier bug
4. Define API versioning strategy
5. Create production service accounts for partners
6. Implement per-client rate limiting
7. Secret rotation policy implementation (90-day cycle)

---

**Document Version:** 1.0
**Created:** November 13, 2025
**Owner:** Development Team
